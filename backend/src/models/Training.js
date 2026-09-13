import mongoose from "mongoose";
const schema = new mongoose.Schema(
  {
    survey: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Survey",
      unique: true,
      required: true,
    },
    trainingReceived: String,
    wantTraining: String,
    status: {
      type: String,
      enum: ["Not Conducted", "Scheduled", "Completed"],
      default: "Not Conducted",
    },
  },
  { timestamps: true },
);
export const Training = mongoose.model("Training", schema);
