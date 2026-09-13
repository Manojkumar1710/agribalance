import mongoose from "mongoose";
const schema = new mongoose.Schema(
  {
    survey: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Survey",
      unique: true,
      required: true,
    },
    soilTest: { type: String, enum: ["Yes", "No"], required: true },
    status: String,
    message: String,
  },
  { timestamps: true },
);
export const SoilTesting = mongoose.model("SoilTesting", schema);
