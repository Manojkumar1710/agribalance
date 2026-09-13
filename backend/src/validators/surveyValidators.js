import { z } from "zod";
const location = z
  .object({
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
    accuracy: z.number().nonnegative().optional(),
    capturedAt: z.coerce.date().optional(),
    address: z.string().optional(),
    manual: z.boolean().optional(),
  })
  .partial({ accuracy: true, capturedAt: true, address: true, manual: true });
export const surveySchema = z.object({
  id: z.string().optional(),
  date: z.string().min(1),
  village: z.string().trim().min(1).max(150),
  farmerName: z.string().max(150).optional().default(""),
  age: z.coerce.number().int().min(1).max(120),
  gender: z.string().min(1),
  education: z.string().min(1),
  mobile: z
    .string()
    .regex(/^\d{7,15}$/)
    .optional()
    .or(z.literal("")),
  landSize: z.string().min(1),
  crops: z.string().min(1),
  irrigation: z.string().min(1),
  experience: z.string().min(1),
  location: location.optional(),
  fertilizers: z.array(z.string()).min(1),
  fertilizerDecision: z.string().min(1),
  organicManureUse: z.string().min(1),
  soilTest: z.enum(["Yes", "No"]),
  pesticideTiming: z.string().min(1),
  pesticideDosage: z.enum(["Always", "Sometimes", "Never"]),
  safetyEquipment: z.enum(["Yes", "No"]),
  challenges: z.array(z.string()).min(1),
  trainingReceived: z.enum(["Yes", "No"]),
  wantTraining: z.enum(["Yes", "No", "Maybe"]),
  suggestions: z.string().optional().default(""),
  surveyedBy: z.string().min(1),
  studentSignature: z.string().min(1),
  farmerConsent: z.literal(true),
  trainingStatus: z
    .enum(["Not Conducted", "Scheduled", "Completed"])
    .optional(),
  followUpStatus: z.string().optional(),
  status: z.enum(["DRAFT", "SUBMITTED"]).optional(),
});
