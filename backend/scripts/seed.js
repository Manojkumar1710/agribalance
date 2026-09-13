import bcrypt from "bcryptjs";
import { connectDatabase } from "../src/config/db.js";
import { User } from "../src/models/User.js";
import { Farmer } from "../src/models/Farmer.js";
import { Survey } from "../src/models/Survey.js";
import { Farm } from "../src/models/Farm.js";
import { FertilizerAssessment } from "../src/models/FertilizerAssessment.js";
import { PesticideAssessment } from "../src/models/PesticideAssessment.js";
import { SoilTesting } from "../src/models/SoilTesting.js";
import { Training } from "../src/models/Training.js";
import { FarmingChallenge } from "../src/models/FarmingChallenge.js";
import { assessFarmer } from "../src/services/riskService.js";
import mongoose from "mongoose";

const good = [
  ["Ramesh Yadav", "Rampur", "Paddy, Wheat"],
  ["Mohan Lal", "Rampur", "Sugarcane"],
  ["Geeta Kumari", "Anandpur", "Vegetables"],
  ["Kamla Devi", "Krishnanagar", "Paddy, Vegetables"],
  ["Pooja Yadav", "Sundarpur", "Vegetables"],
  ["Balram Singh", "Devgaon", "Wheat, Mustard"],
];
const bad = [
  ["Sita Devi", "Rampur", "Cotton"],
  ["Suresh Patel", "Anandpur", "Groundnut"],
  ["Anita Bai", "Anandpur", "Paddy"],
  ["Devendra Singh", "Anandpur", "Wheat"],
  ["Vinod Kumar", "Krishnanagar", "Cotton"],
  ["Rekha Sharma", "Krishnanagar", "Maize"],
  ["Harish Chandra", "Krishnanagar", "Sugarcane"],
  ["Rajendra Prasad", "Sundarpur", "Paddy"],
  ["Manju Kumari", "Sundarpur", "Groundnut"],
  ["Shanti Devi", "Devgaon", "Paddy"],
  ["Naresh Kumar", "Devgaon", "Cotton"],
  ["Kiran Devi", "Rampur", "Paddy"],
];
const dealerLed = new Set([
  "Ramesh Yadav",
  "Sita Devi",
  "Suresh Patel",
  "Anita Bai",
  "Vinod Kumar",
  "Harish Chandra",
  "Rajendra Prasad",
  "Manju Kumari",
  "Shanti Devi",
]);
function answers([farmerName, village, crops], isGood, index) {
  return {
    date: `2026-0${(index % 8) + 2}-15`,
    village,
    farmerName,
    age: 40 + index,
    gender: index % 3 === 0 ? "Female" : "Male",
    education: "Secondary",
    mobile: `987650${String(index + 1).padStart(4, "0")}`,
    landSize: "1–3 Acres",
    crops,
    irrigation: "Borewell",
    experience: "10–20 Years",
    location: {
      latitude: 22 + index / 100,
      longitude: 78 + index / 100,
      accuracy: 10,
    },
    fertilizers: isGood ? ["Urea", "DAP", "Compost"] : ["Urea", "DAP"],
    fertilizerDecision: isGood
      ? "Agriculture Officer"
      : dealerLed.has(farmerName)
        ? "Dealer"
        : "Personal Experience",
    organicManureUse: isGood ? "Always" : "Never",
    soilTest: isGood ? "Yes" : "No",
    pesticideTiming: isGood ? "Only when pests appear" : "Regularly",
    pesticideDosage: isGood ? "Always" : "Sometimes",
    safetyEquipment: isGood ? "Yes" : "No",
    challenges: isGood ? ["Labour"] : ["High Fertilizer Cost", "Pest Attacks"],
    trainingReceived: isGood ? "Yes" : "No",
    wantTraining: isGood ? "No" : "Yes",
    suggestions: "",
    surveyedBy: "Seeded Demo User",
    studentSignature: "Seeded Demo User",
    farmerConsent: true,
    trainingStatus: "Not Conducted",
    followUpStatus: "Pending",
  };
}
function key(a) {
  return `mob-${a.mobile}`;
}
async function seed() {
  await connectDatabase();
  await Promise.all([
    User.deleteMany({}),
    Farmer.deleteMany({}),
    Survey.deleteMany({}),
    Farm.deleteMany({}),
    FertilizerAssessment.deleteMany({}),
    PesticideAssessment.deleteMany({}),
    SoilTesting.deleteMany({}),
    Training.deleteMany({}),
    FarmingChallenge.deleteMany({}),
  ]);
  const passwordHash = await bcrypt.hash("AgriBalanceDemo2026!", 12);
  const [worker] = await User.create([
    {
      name: "Demo Field Worker",
      email: "worker@agribalance.local",
      passwordHash,
      role: "FIELD_WORKER",
    },
    {
      name: "Demo Coordinator",
      email: "coordinator@agribalance.local",
      passwordHash,
      role: "COORDINATOR",
    },
    {
      name: "Demo Admin",
      email: "admin@agribalance.local",
      passwordHash,
      role: "ADMIN",
    },
  ]);
  const records = [
    ...good.map((x) => [x, true]),
    ...bad.map((x) => [x, false]),
  ];
  for (let i = 0; i < records.length; i += 1) {
    const [identity, isGood] = records[i];
    const a = answers(identity, isGood, i);
    const assessment = assessFarmer(a);
    const farmer = await Farmer.create({
      farmerKey: key(a),
      name: a.farmerName,
      mobile: a.mobile,
      age: a.age,
      gender: a.gender,
      education: a.education,
      village: a.village,
    });
    const survey = await Survey.create({
      surveyId: `SUR-${String(i + 1).padStart(4, "0")}`,
      farmer: farmer._id,
      conductedBy: worker._id,
      surveyDate: new Date(a.date),
      status: "SUBMITTED",
      overallRisk: assessment.overallRisk,
      priority: assessment.priority,
      recommendations: assessment.recommendations,
      answers: {
        ...a,
        fertilizerRisk: assessment.fertilizerRisk,
        pesticideRisk: assessment.pesticideRisk,
        soilStatus: assessment.soilStatus,
      },
      location: a.location,
    });
    await Farm.create({
      farmer: farmer._id,
      survey: survey._id,
      landSize: a.landSize,
      crops: a.crops,
      irrigation: a.irrigation,
      experience: a.experience,
      location: a.location,
    });
    await FertilizerAssessment.create({
      survey: survey._id,
      fertilizers: a.fertilizers,
      fertilizerDecision: a.fertilizerDecision,
      organicManureUse: a.organicManureUse,
      risk: assessment.fertilizerRisk,
    });
    await PesticideAssessment.create({
      survey: survey._id,
      pesticideTiming: a.pesticideTiming,
      pesticideDosage: a.pesticideDosage,
      safetyEquipment: a.safetyEquipment,
      risk: assessment.pesticideRisk,
    });
    await SoilTesting.create({
      survey: survey._id,
      soilTest: a.soilTest,
      status: assessment.soilStatus.status,
      message: assessment.soilStatus.message,
    });
    await Training.create({
      survey: survey._id,
      trainingReceived: a.trainingReceived,
      wantTraining: a.wantTraining,
    });
    await FarmingChallenge.insertMany(
      a.challenges.map((challenge) => ({ survey: survey._id, challenge })),
    );
  }
  console.log(
    "Seed complete: 18 surveys, 5 villages. Demo password: AgriBalanceDemo2026!",
  );
  await mongoose.disconnect();
}
seed().catch(async (error) => {
  console.error(error);
  await mongoose.disconnect();
  process.exit(1);
});
