import mongoose from "mongoose";
import { Survey } from "../models/Survey.js";
import { Farmer } from "../models/Farmer.js";
import { Farm } from "../models/Farm.js";
import { FertilizerAssessment } from "../models/FertilizerAssessment.js";
import { PesticideAssessment } from "../models/PesticideAssessment.js";
import { SoilTesting } from "../models/SoilTesting.js";
import { Training } from "../models/Training.js";
import { FarmingChallenge } from "../models/FarmingChallenge.js";
import { assessFarmer } from "../services/riskService.js";

function farmerKey(data) {
  return data.mobile?.trim()
    ? `mob-${data.mobile.trim()}`
    : `nm-${(data.farmerName || "anonymous").toLowerCase().trim()}-${data.village.toLowerCase().trim()}`.replace(
        /\s+/g,
        "-",
      );
}
export function toRecord(survey) {
  const a = survey.answers || {};
  return {
    ...a,
    id: survey.surveyId,
    farmerKey: survey.farmer.farmerKey,
    overallRisk: survey.overallRisk,
    priority: survey.priority,
    recommendations: survey.recommendations,
    fertilizerRisk: a.fertilizerRisk,
    pesticideRisk: a.pesticideRisk,
    soilStatus: a.soilStatus,
    trainingStatus: a.trainingStatus || "Not Conducted",
    followUpStatus: a.followUpStatus || "Pending",
    createdAt: survey.createdAt,
    location: survey.location,
  };
}

export async function createSurvey(req, res) {
  const data = req.body;
  const assessment = assessFarmer(data);
  const key = farmerKey(data);
  const session = await mongoose.startSession();
  try {
    let result;
    await session.withTransaction(async () => {
      const farmer = await Farmer.findOneAndUpdate(
        { farmerKey: key },
        {
          $set: {
            name: data.farmerName || "",
            mobile: data.mobile || "",
            age: data.age,
            gender: data.gender,
            education: data.education,
            village: data.village,
          },
          $setOnInsert: { farmerKey: key },
        },
        { new: true, upsert: true, session },
      );
      const surveyId =
        data.id || `SUR-${Date.now().toString(36).toUpperCase()}`;
      const survey = await Survey.create(
        [
          {
            surveyId,
            farmer: farmer._id,
            conductedBy: req.user._id,
            surveyDate: new Date(data.date),
            status: data.status || "SUBMITTED",
            overallRisk: assessment.overallRisk,
            priority: assessment.priority,
            recommendations: assessment.recommendations,
            answers: {
              ...data,
              fertilizerRisk: assessment.fertilizerRisk,
              pesticideRisk: assessment.pesticideRisk,
              soilStatus: assessment.soilStatus,
            },
            location: data.location,
          },
        ],
        { session },
      );
      const current = survey[0];
      await Farm.create(
        [
          {
            farmer: farmer._id,
            survey: current._id,
            landSize: data.landSize,
            crops: data.crops,
            irrigation: data.irrigation,
            experience: data.experience,
            location: data.location,
          },
        ],
        { session },
      );
      await FertilizerAssessment.create(
        [
          {
            survey: current._id,
            fertilizers: data.fertilizers,
            fertilizerDecision: data.fertilizerDecision,
            organicManureUse: data.organicManureUse,
            risk: assessment.fertilizerRisk,
          },
        ],
        { session },
      );
      await PesticideAssessment.create(
        [
          {
            survey: current._id,
            pesticideTiming: data.pesticideTiming,
            pesticideDosage: data.pesticideDosage,
            safetyEquipment: data.safetyEquipment,
            risk: assessment.pesticideRisk,
          },
        ],
        { session },
      );
      await SoilTesting.create(
        [
          {
            survey: current._id,
            soilTest: data.soilTest,
            status: assessment.soilStatus.status,
            message: assessment.soilStatus.message,
          },
        ],
        { session },
      );
      await Training.create(
        [
          {
            survey: current._id,
            trainingReceived: data.trainingReceived,
            wantTraining: data.wantTraining,
            status: data.trainingStatus || "Not Conducted",
          },
        ],
        { session },
      );
      await FarmingChallenge.insertMany(
        (data.challenges || []).map((challenge) => ({
          survey: current._id,
          challenge,
        })),
        { session },
      );
      result = await Survey.findById(current._id)
        .populate("farmer")
        .session(session);
    });
    res.status(201).json({ success: true, data: toRecord(result) });
  } finally {
    await session.endSession();
  }
}
export async function listSurveys(req, res) {
  const page = Math.max(1, Number(req.query.page || 1));
  const limit = Math.min(100, Math.max(1, Number(req.query.limit || 20)));
  const filter = {};
  if (req.query.risk) filter.overallRisk = req.query.risk;
  if (req.query.village) filter["answers.village"] = req.query.village;
  const [rows, total] = await Promise.all([
    Survey.find(filter)
      .populate("farmer")
      .sort({ surveyDate: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    Survey.countDocuments(filter),
  ]);
  res.json({
    success: true,
    data: rows.map(toRecord),
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
}
export async function getSurvey(req, res) {
  const row = await Survey.findOne({ surveyId: req.params.id }).populate(
    "farmer",
  );
  if (!row)
    return res
      .status(404)
      .json({
        success: false,
        message: "Survey not found",
        error: "SURVEY_NOT_FOUND",
      });
  res.json({ success: true, data: toRecord(row) });
}
export async function updateSurvey(req, res) {
  const row = await Survey.findOneAndUpdate(
    { surveyId: req.params.id },
    {
      $set: {
        "answers.trainingStatus": req.body.trainingStatus,
        "answers.followUpStatus": req.body.followUpStatus,
      },
    },
    { new: true },
  ).populate("farmer");
  if (!row)
    return res
      .status(404)
      .json({
        success: false,
        message: "Survey not found",
        error: "SURVEY_NOT_FOUND",
      });
  res.json({ success: true, data: toRecord(row) });
}
export async function deleteSurvey(req, res) {
  const row = await Survey.findOneAndDelete({ surveyId: req.params.id });
  if (!row)
    return res
      .status(404)
      .json({
        success: false,
        message: "Survey not found",
        error: "SURVEY_NOT_FOUND",
      });
  res.json({ success: true, data: { id: req.params.id } });
}
