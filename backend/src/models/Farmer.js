import mongoose from "mongoose";

const schema = new mongoose.Schema(
  {
    farmerKey: { type: String, index: true },
    name: { type: String, trim: true, default: "" },
    mobile: { type: String, trim: true, index: true },
    age: Number,
    gender: String,
    education: String,
    village: { type: String, required: true, trim: true, index: true },
  },
  { timestamps: true },
);
schema.index({ name: "text", village: "text", mobile: "text" });
export const Farmer = mongoose.model("Farmer", schema);
