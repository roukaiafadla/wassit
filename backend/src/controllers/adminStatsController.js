import Job from "../models/Job.js";
import Offer from "../models/Offer.js";
import User from "../models/User.js";
import { assertRequest } from "../utils/validation.js";

const DEFAULT_DAYS = 30;
const MAX_DAYS = 365;

// Demand-by-area grid: 20 cells per degree, so each cell is 0.05 degrees
// (roughly 5 km). Cells are computed with integer maths in the pipeline
// ($floor of coordinate * 20) so a job sitting exactly on a cell edge can't be
// pushed into the wrong cell by floating-point error.
const CELLS_PER_DEGREE = 20;

const ROLES = ["client", "provider", "admin"];
const JOB_STATUSES = ["open", "matched", "completed", "cancelled"];

function parseDays(raw) {
  if (raw === undefined) return DEFAULT_DAYS;
  const days = Number(raw);
  assertRequest(Number.isInteger(days) && days >= 1 && days <= MAX_DAYS, `days must be a whole number from 1 to ${MAX_DAYS}`);
  return days;
}

// Start of the window: 00:00 UTC, (days - 1) days ago, so "days=7" means
// today plus the 6 days before it.
function windowStart(days) {
  const start = new Date();
  start.setUTCHours(0, 0, 0, 0);
  start.setUTCDate(start.getUTCDate() - (days - 1));
  return start;
}

// Turns [{ _id: "open", count: 3 }] into { open: 3 }, filling missing keys with 0
// so the dashboard never has to check whether a key exists.
function countsByKey(keys, rows) {
  const out = Object.fromEntries(keys.map((key) => [key, 0]));
  for (const row of rows) out[row._id] = row.count;
  return out;
}

const cellCenter = (index) => Math.round(((index + 0.5) / CELLS_PER_DEGREE) * 10000) / 10000;

/**
 * GET /api/admin/stats/overview - headline numbers for the dashboard cards.
 */
export async function overview(req, res) {
  const [usersByRole, pendingProviders, jobsByStatus, offers] = await Promise.all([
    User.aggregate([{ $group: { _id: "$role", count: { $sum: 1 } } }]),
    User.countDocuments({ role: "provider", verified: false }),
    Job.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]),
    Offer.countDocuments(),
  ]);

  res.json({
    users: countsByKey(ROLES, usersByRole),
    pendingProviders,
    jobs: countsByKey(JOB_STATUSES, jobsByStatus),
    offers,
  });
}

/**
 * GET /api/admin/stats/demand/categories?days=30 - jobs posted per category
 * in the window, busiest first. `matched` counts jobs that found a provider
 * (matched or completed), so jobs vs matched shows where demand goes unmet.
 */
export async function demandByCategory(req, res) {
  const days = parseDays(req.query.days);

  const rows = await Job.aggregate([
    { $match: { createdAt: { $gte: windowStart(days) } } },
    {
      $group: {
        _id: "$category",
        jobs: { $sum: 1 },
        matched: {
          $sum: { $cond: [{ $or: [{ $eq: ["$status", "matched"] }, { $eq: ["$status", "completed"] }] }, 1, 0] },
        },
      },
    },
    { $sort: { jobs: -1, _id: 1 } },
  ]);

  res.json({ days, categories: rows.map((r) => ({ category: r._id, jobs: r.jobs, matched: r.matched })) });
}

/**
 * GET /api/admin/stats/demand/areas?days=30 - jobs per ~5 km grid cell, busiest
 * first (top 50). lat/lng is the centre of the cell.
 */
export async function demandByArea(req, res) {
  const days = parseDays(req.query.days);

  const rows = await Job.aggregate([
    { $match: { createdAt: { $gte: windowStart(days) } } },
    {
      $group: {
        _id: {
          y: { $floor: { $multiply: [{ $arrayElemAt: ["$location.coordinates", 1] }, CELLS_PER_DEGREE] } },
          x: { $floor: { $multiply: [{ $arrayElemAt: ["$location.coordinates", 0] }, CELLS_PER_DEGREE] } },
        },
        jobs: { $sum: 1 },
      },
    },
    { $sort: { jobs: -1, "_id.y": 1, "_id.x": 1 } },
    { $limit: 50 },
  ]);

  res.json({
    days,
    cellDegrees: 1 / CELLS_PER_DEGREE,
    areas: rows.map((r) => ({ lat: cellCenter(r._id.y), lng: cellCenter(r._id.x), jobs: r.jobs })),
  });
}

/**
 * GET /api/admin/stats/demand/timeline?days=30 - jobs posted per day (UTC),
 * with zero-job days included so a line chart has no gaps.
 */
export async function demandTimeline(req, res) {
  const days = parseDays(req.query.days);
  const start = windowStart(days);

  const rows = await Job.aggregate([
    { $match: { createdAt: { $gte: start } } },
    { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } }, jobs: { $sum: 1 } } },
    { $sort: { _id: 1 } },
  ]);

  const counts = new Map(rows.map((r) => [r._id, r.jobs]));
  const timeline = [];
  for (let i = 0; i < days; i++) {
    const day = new Date(start);
    day.setUTCDate(start.getUTCDate() + i);
    const date = day.toISOString().slice(0, 10);
    timeline.push({ date, jobs: counts.get(date) || 0 });
  }

  res.json({ days, timeline });
}
