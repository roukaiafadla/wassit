import mongoose from "mongoose";

const { Schema } = mongoose;

const pointSchema = new Schema(
  {
    type: { type: String, enum: ["Point"], default: "Point" },
    coordinates: { type: [Number], required: true }, // [lng, lat]
  },
  { _id: false }
);

const jobSchema = new Schema(
  {
    clientId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    description: { type: String, required: true },

    category: { type: String, required: true },
    urgency: { type: String, enum: ["low", "medium", "high"], default: "medium" },
    suggestedPriceMin: { type: Number },
    suggestedPriceMax: { type: Number },

    location: { type: pointSchema, required: true },

    status: {
      type: String,
      enum: ["open", "matched", "completed", "cancelled"],
      default: "open",
    },
    acceptedOfferId: { type: Schema.Types.ObjectId, ref: "Offer", default: null },
  },
  { timestamps: true }
);

jobSchema.index({ location: "2dsphere" });
jobSchema.index({ status: 1, category: 1 });

export default mongoose.model("Job", jobSchema);
