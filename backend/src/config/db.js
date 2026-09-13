import mongoose from "mongoose";
import { env } from "./env.js";

export async function connectDatabase() {
  try {
    await mongoose.connect(env.mongoUri);
    console.log(`MongoDB connected: ${mongoose.connection.name}`);
  } catch (error) {
    console.error(`MongoDB connection failed: ${error.message}`);
    throw error;
  }
}

export function databaseStatus() {
  return mongoose.connection.readyState === 1 ? "connected" : "disconnected";
}
