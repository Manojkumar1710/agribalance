import { Farmer } from "../models/Farmer.js";
import { Survey } from "../models/Survey.js";
import { toRecord } from "./surveyController.js";
export async function listFarmers(req, res) {
  const page = Math.max(1, Number(req.query.page || 1));
  const limit = Math.min(100, Math.max(1, Number(req.query.limit || 20)));
  const q = req.query.search?.trim();
  const filter = {};
  if (q)
    filter.$or = [
      { name: new RegExp(q, "i") },
      { mobile: new RegExp(q, "i") },
      { village: new RegExp(q, "i") },
    ];
  if (req.query.village) filter.village = req.query.village;
  const [data, total] = await Promise.all([
    Farmer.find(filter)
      .sort({ updatedAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    Farmer.countDocuments(filter),
  ]);
  res.json({
    success: true,
    data,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
}
export async function getFarmer(req, res) {
  const farmer = await Farmer.findById(req.params.id);
  if (!farmer)
    return res
      .status(404)
      .json({
        success: false,
        message: "Farmer not found",
        error: "FARMER_NOT_FOUND",
      });
  res.json({ success: true, data: farmer });
}
export async function farmerSurveys(req, res) {
  const rows = await Survey.find({ farmer: req.params.id })
    .populate("farmer")
    .sort({ surveyDate: 1 });
  res.json({ success: true, data: rows.map(toRecord) });
}
