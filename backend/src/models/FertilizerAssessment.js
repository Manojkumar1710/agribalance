import mongoose from "mongoose";
const schema = new mongoose.Schema(
  {
    survey: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Survey",
      unique: true,
      required: true,
    },
    fertilizers: [String],
    fertilizerDecision: String,
    organicManureUse: String,
    risk: mongoose.Schema.Types.Mixed,
  },
  { timestamps: true },
);
export const FertilizerAssessment = mongoose.model(
  "FertilizerAssessment",
  schema,
);
