import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { env } from "./config/env.js";
import { databaseStatus } from "./config/db.js";
import authRoutes from "./routes/authRoutes.js";
import farmerRoutes from "./routes/farmerRoutes.js";
import surveyRoutes from "./routes/surveyRoutes.js";
import dashboardRoutes from "./routes/dashboardRoutes.js";
import villageRoutes from "./routes/villageRoutes.js";
import followUpRoutes from "./routes/followUpRoutes.js";
import { notFound, errorHandler } from "./middleware/errorMiddleware.js";

const app = express();
app.use(helmet());
app.use(cors({ origin: env.frontendUrl, credentials: true }));
app.use(express.json({ limit: "1mb" }));
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 300,
    standardHeaders: "draft-8",
    legacyHeaders: false,
  }),
);
app.get("/api/health", (req, res) => {
  const database = databaseStatus();
  res
    .status(database === "connected" ? 200 : 503)
    .json({
      success: database === "connected",
      status: database === "connected" ? "ok" : "unhealthy",
      database,
    });
});
app.use("/api/auth", authRoutes);
app.use("/api/farmers", farmerRoutes);
app.use("/api/surveys", surveyRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/villages", villageRoutes);
app.use("/api/followups", followUpRoutes);
app.use(notFound);
app.use(errorHandler);
export default app;
