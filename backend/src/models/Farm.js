import mongoose from "mongoose";

const location = new mongoose.Schema(
  {
    latitude: { type: Number, min: -90, max: 90 },
    longitude: { type: Number, min: -180, max: 180 },
    accuracy: Number,
    capturedAt: Date,
    address: String,
    manual: Boolean,
  },
  { _id: false },
);
const schema = new mongoose.Schema(
  {
    farmer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Farmer",
      required: true,
      index: true,
    },
    survey: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Survey",
      required: true,
    },
    landSize: String,
    crops: String,
    irrigation: String,
    experience: String,
    location,
  },
  { timestamps: true },
);
export const Farm = mongoose.model("Farm", schema);
