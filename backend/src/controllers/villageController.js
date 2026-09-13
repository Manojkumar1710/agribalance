import { Survey } from "../models/Survey.js";
const pct = (n, t) => (t ? Math.round((n / t) * 100) : 0);
function stats(rows, village) {
  const list = rows.filter((r) => r.answers.village === village);
  const total = list.length;
  const count = (fn) => list.filter(fn).length;
  const challenges = {};
  list.forEach((r) =>
    (r.answers.challenges || []).forEach((x) => {
      challenges[x] = (challenges[x] || 0) + 1;
    }),
  );
  const tags = [
    pct(
      count((r) => r.answers.soilTest === "No"),
      total,
    ),
    pct(
      count((r) => r.answers.safetyEquipment === "No"),
      total,
    ),
    pct(
      count((r) =>
        ["Dealer", "Friends"].includes(r.answers.fertilizerDecision),
      ),
      total,
    ),
    pct(
      count((r) => r.answers.trainingReceived === "No"),
      total,
    ),
  ];
  const score = tags.reduce((s, n) => s + (n >= 60 ? 2 : n >= 30 ? 1 : 0), 0);
  return {
    village,
    total,
    soilTestNoPct: pct(
      count((r) => r.answers.soilTest === "No"),
      total,
    ),
    noSafetyPct: pct(
      count((r) => r.answers.safetyEquipment === "No"),
      total,
    ),
    dealerDecisionPct: pct(
      count((r) =>
        ["Dealer", "Friends"].includes(r.answers.fertilizerDecision),
      ),
      total,
    ),
    noTrainingPct: pct(
      count((r) => r.answers.trainingReceived === "No"),
      total,
    ),
    riskCounts: {
      Low: count((r) => r.overallRisk === "Low"),
      Medium: count((r) => r.overallRisk === "Medium"),
      High: count((r) => r.overallRisk === "High"),
    },
    challenges: Object.entries(challenges).map(([name, value]) => ({
      name,
      value,
    })),
    hotspotScore: score,
  };
}
export async function listVillages(req, res) {
  const rows = await Survey.find({ status: "SUBMITTED" }).lean();
  const villages = [
    ...new Set(rows.map((r) => r.answers.village).filter(Boolean)),
  ].sort();
  res.json({ success: true, data: villages.map((v) => stats(rows, v)) });
}
export async function getVillage(req, res) {
  const rows = await Survey.find({ status: "SUBMITTED" }).lean();
  const data = stats(rows, req.params.village);
  if (!data.total)
    return res
      .status(404)
      .json({
        success: false,
        message: "Village not found",
        error: "VILLAGE_NOT_FOUND",
      });
  res.json({ success: true, data });
}
export async function compareVillages(req, res) {
  const rows = await Survey.find({ status: "SUBMITTED" }).lean();
  const villages = [
    ...new Set(rows.map((r) => r.answers.village).filter(Boolean)),
  ]
    .map((v) => stats(rows, v))
    .sort((a, b) => b.hotspotScore - a.hotspotScore);
  res.json({ success: true, data: villages });
}
