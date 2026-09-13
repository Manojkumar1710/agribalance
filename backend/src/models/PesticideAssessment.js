import mongoose from "mongoose";
const schema = new mongoose.Schema(
  {
    survey: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Survey",
      unique: true,
      required: true,
    },
    pesticideTiming: String,
    pesticideDosage: String,
    safetyEquipment: String,
    risk: mongoose.Schema.Types.Mixed,
  },
  { timestamps: true },
);
export const PesticideAssessment = mongoose.model(
  "PesticideAssessment",
  schema,
);
