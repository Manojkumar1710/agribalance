import mongoose from "mongoose";
const schema = new mongoose.Schema(
  {
    farmer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Farmer",
      required: true,
    },
    survey: { type: mongoose.Schema.Types.ObjectId, ref: "Survey" },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    status: {
      type: String,
      enum: ["PENDING", "SCHEDULED", "COMPLETED"],
      default: "PENDING",
      index: true,
    },
    followUpDate: { type: Date, index: true },
    notes: String,
    completedAt: Date,
  },
  { timestamps: true },
);
export const FollowUp = mongoose.model("FollowUp", schema);
