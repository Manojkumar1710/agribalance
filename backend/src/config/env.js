import "dotenv/config";

const required = ["MONGODB_URI", "JWT_SECRET"];
for (const key of required) {
  if (!process.env[key]) throw new Error(`${key} is required`);
}

export const env = {
  mongoUri: process.env.MONGODB_URI,
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "7d",
  port: Number(process.env.PORT || 5000),
  nodeEnv: process.env.NODE_ENV || "development",
  frontendUrl: process.env.FRONTEND_URL || "http://localhost:5173",
};
