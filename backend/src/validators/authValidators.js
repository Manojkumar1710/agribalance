import { z } from "zod";
export const registerSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z
    .string()
    .email()
    .transform((v) => v.toLowerCase()),
  password: z.string().min(8).max(128),
  role: z.enum(["FIELD_WORKER", "COORDINATOR", "ADMIN"]).optional(),
});
export const loginSchema = z.object({
  email: z
    .string()
    .email()
    .transform((v) => v.toLowerCase()),
  password: z.string().min(1),
});
