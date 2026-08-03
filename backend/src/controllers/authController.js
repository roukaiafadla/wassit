import bcrypt from "bcryptjs";

import User from "../models/User.js";
import { signToken } from "../utils/jwt.js";
import { assertRequest, isValidEmail } from "../utils/validation.js";

const PUBLIC_FIELDS =
  "_id name email role location categories coverageRadiusKm verified ratingAvg ratingCount createdAt";

export async function signup(req, res) {
  const { name, email, password, role, categories, coverageRadiusKm, latitude, longitude } = req.body;

  assertRequest(name && name.trim(), "Name is required");
  assertRequest(isValidEmail(email), "A valid email is required");
  assertRequest(password && password.length >= 8, "Password must be at least 8 characters");
  assertRequest(["client", "provider"].includes(role), "Role must be 'client' or 'provider'");

  const hasLocation = typeof latitude === "number" && typeof longitude === "number";
  if (latitude !== undefined || longitude !== undefined) {
    assertRequest(hasLocation, "latitude and longitude must both be numbers if provided");
  }

  const existing = await User.findOne({ email: email.toLowerCase() });
  assertRequest(!existing, "An account with this email already exists");

  const passwordHash = await bcrypt.hash(password, 10);

  const user = await User.create({
    name: name.trim(),
    email: email.toLowerCase(),
    passwordHash,
    role,
    // Providers set these at signup; ignored/defaulted for clients.
    categories: role === "provider" ? categories || [] : [],
    coverageRadiusKm: role === "provider" ? coverageRadiusKm || 10 : undefined,
    // Providers start unverified and go into the admin approval queue (flow 6 in the spec).
    verified: role === "provider" ? false : undefined,
    // Optional at signup — can also be set/updated later via PATCH /api/users/me/location.
    location: hasLocation ? { type: "Point", coordinates: [longitude, latitude] } : undefined,
  });

  const token = signToken(user);
  res.status(201).json({ token, user: sanitize(user) });
}

export async function login(req, res) {
  const { email, password } = req.body;

  assertRequest(isValidEmail(email), "A valid email is required");
  assertRequest(password, "Password is required");

  const user = await User.findOne({ email: email.toLowerCase() });
  assertRequest(user, "Invalid email or password");

  const match = await bcrypt.compare(password, user.passwordHash);
  assertRequest(match, "Invalid email or password");

  const token = signToken(user);
  res.json({ token, user: sanitize(user) });
}

export async function me(req, res) {
  const user = await User.findById(req.user.id).select(PUBLIC_FIELDS);
  if (!user) {
    return res.status(404).json({ error: "User not found" });
  }
  res.json({ user });
}

// Strips passwordHash and Mongoose internals before sending a user back to the client.
function sanitize(userDoc) {
  const obj = userDoc.toObject();
  delete obj.passwordHash;
  delete obj.__v;
  return obj;
}
