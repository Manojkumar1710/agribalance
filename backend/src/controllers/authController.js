import bcrypt from "bcryptjs";
import { User } from "../models/User.js";
import { generateToken } from "../utils/generateToken.js";

const safe = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
});
export async function register(req, res) {
  if (await User.exists({ email: req.body.email }))
    return res
      .status(409)
      .json({
        success: false,
        message: "Email is already registered",
        error: "DUPLICATE_EMAIL",
      });
  const passwordHash = await bcrypt.hash(req.body.password, 12);
  const user = await User.create({
    name: req.body.name,
    email: req.body.email,
    passwordHash,
    role: req.body.role || "FIELD_WORKER",
  });
  res
    .status(201)
    .json({
      success: true,
      data: { user: safe(user), token: generateToken(user) },
    });
}
export async function login(req, res) {
  const user = await User.findOne({ email: req.body.email }).select(
    "+passwordHash",
  );
  if (!user || !(await bcrypt.compare(req.body.password, user.passwordHash)))
    return res
      .status(401)
      .json({
        success: false,
        message: "Invalid email or password",
        error: "INVALID_CREDENTIALS",
      });
  res.json({
    success: true,
    data: { user: safe(user), token: generateToken(user) },
  });
}
export async function me(req, res) {
  res.json({ success: true, data: { user: safe(req.user) } });
}
