import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { User } from "../models/User.js";

export async function requireAuth(req, res, next) {
  const token = req.headers.authorization?.startsWith("Bearer ")
    ? req.headers.authorization.slice(7)
    : null;
  if (!token)
    return res
      .status(401)
      .json({
        success: false,
        message: "Authentication required",
        error: "UNAUTHENTICATED",
      });
  try {
    const payload = jwt.verify(token, env.jwtSecret);
    req.user = await User.findById(payload.userId).select("-passwordHash");
    if (!req.user)
      return res
        .status(401)
        .json({
          success: false,
          message: "User session is invalid",
          error: "INVALID_SESSION",
        });
    next();
  } catch {
    return res
      .status(401)
      .json({
        success: false,
        message: "Invalid or expired token",
        error: "INVALID_TOKEN",
      });
  }
}

export const allowRoles =
  (...roles) =>
  (req, res, next) => {
    if (!roles.includes(req.user.role))
      return res
        .status(403)
        .json({
          success: false,
          message: "You are not authorized for this action",
          error: "FORBIDDEN",
        });
    next();
  };
