import mongoose from "mongoose";

const schema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    passwordHash: { type: String, required: true, select: false },
    role: {
      type: String,
      enum: ["FIELD_WORKER", "COORDINATOR", "ADMIN"],
      default: "FIELD_WORKER",
    },
  },
  { timestamps: true },
);

export const User = mongoose.model("User", schema);
