import mongoose from "mongoose";

const { Schema } = mongoose;

const disputeSchema = new Schema(
  {
    jobId: { type: Schema.Types.ObjectId, ref: "Job", required: true },
    raisedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    against: { type: Schema.Types.ObjectId, ref: "User", required: true },
    reason: { type: String, required: true, trim: true, maxlength: 1000 },

    status: { type: String, enum: ["open", "resolved", "dismissed"], default: "open" },

    // Filled in by an admin when the dispute is closed
    resolutionNote: { type: String, default: "" },
    resolvedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
    resolvedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

// One OPEN dispute per person per job. A resolved or dismissed one doesn't
// block raising a new dispute later, which is why the index is partial.
disputeSchema.index({ jobId: 1, raisedBy: 1 }, { unique: true, partialFilterExpression: { status: "open" } });

// For the admin queue: filter by status, oldest first
disputeSchema.index({ status: 1, createdAt: 1 });

export default mongoose.model("Dispute", disputeSchema);
