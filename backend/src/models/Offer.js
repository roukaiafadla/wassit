import mongoose from "mongoose";

const { Schema } = mongoose;

const offerSchema = new Schema(
  {
    jobId: { type: Schema.Types.ObjectId, ref: "Job", required: true, index: true },
    providerId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    price: { type: Number, required: true },
    etaMinutes: { type: Number, required: true },
    status: {
      type: String,
      enum: ["pending", "accepted", "rejected", "withdrawn"],
      default: "pending",
    },
  },
  { timestamps: true }
);

// A provider shouldn't have two active offers on the same job
offerSchema.index({ jobId: 1, providerId: 1 }, { unique: true });

export default mongoose.model("Offer", offerSchema);
