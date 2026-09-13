import mongoose from "mongoose";

const schema = new mongoose.Schema(
  {
    surveyId: { type: String, required: true, unique: true, index: true },
    farmer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Farmer",
      required: true,
      index: true,
    },
    conductedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    surveyDate: { type: Date, required: true, index: true },
    status: {
      type: String,
      enum: ["DRAFT", "SUBMITTED"],
      default: "SUBMITTED",
    },
    overallRisk: { type: String, enum: ["Low", "Medium", "High"] },
    priority: mongoose.Schema.Types.Mixed,
    recommendations: [mongoose.Schema.Types.Mixed],
    answers: { type: mongoose.Schema.Types.Mixed, required: true },
    location: mongoose.Schema.Types.Mixed,
  },
  { timestamps: true },
);
schema.index({ overallRisk: 1, status: 1 });
export const Survey = mongoose.model("Survey", schema);
