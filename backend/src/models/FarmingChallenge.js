import mongoose from "mongoose";
const schema = new mongoose.Schema(
  {
    survey: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Survey",
      required: true,
    },
    challenge: { type: String, required: true },
  },
  { timestamps: true },
);
export const FarmingChallenge = mongoose.model("FarmingChallenge", schema);
