import mongoose from "mongoose";

const { Schema } = mongoose;

const pointSchema = new Schema(
  {
    type: { type: String, enum: ["Point"], default: "Point" },
    // GeoJSON order is [longitude, latitude] — easy to get backwards, so
    // double-check this whenever you build a coordinates array.
    coordinates: { type: [Number], default: [0, 0] },
  },
  { _id: false }
);

const userSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ["client", "provider", "admin"], required: true },

    location: { type: pointSchema, default: () => ({}) },

    // Provider-only fields
    categories: { type: [String], default: [] },
    coverageRadiusKm: { type: Number, default: 10 },
    verified: { type: Boolean, default: false },

    ratingAvg: { type: Number, default: 0 },
    ratingCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

// Required for $near / $nearSphere geospatial queries (nearby-provider matching)
userSchema.index({ location: "2dsphere" });

export default mongoose.model("User", userSchema);
