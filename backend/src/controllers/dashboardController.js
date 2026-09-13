import { Survey } from "../models/Survey.js";
export async function summary(req, res) {
  const rows = await Survey.find({ status: "SUBMITTED" }).lean();
  const total = rows.length;
  const count = (fn) => rows.filter(fn).length;
  const pct = (n) => (total ? Math.round((n / total) * 100) : 0);
  const challenges = {};
  rows.forEach((r) =>
    (r.answers.challenges || []).forEach((x) => {
      challenges[x] = (challenges[x] || 0) + 1;
    }),
  );
  const villages = [
    ...new Set(rows.map((r) => r.answers.village).filter(Boolean)),
  ];
  const riskDistribution = {
    Low: count((r) => r.overallRisk === "Low"),
    Medium: count((r) => r.overallRisk === "Medium"),
    High: count((r) => r.overallRisk === "High"),
  };
  const data = {
    totalFarmers: total,
    totalSurveys: total,
    totalVillages: villages.length,
    fertilizer: {
      urea: count((r) => (r.answers.fertilizers || []).includes("Urea")),
    },
    soilTesting: {
      notTested: count((r) => r.answers.soilTest === "No"),
      notTestedPct: pct(count((r) => r.answers.soilTest === "No")),
    },
    pesticide: {
      highRisk: count((r) => r.answers.pesticideRisk?.level === "High"),
      noSafety: count((r) => r.answers.safetyEquipment === "No"),
      noSafetyPct: pct(count((r) => r.answers.safetyEquipment === "No")),
    },
    training: {
      wantTraining: count((r) => r.answers.wantTraining === "Yes"),
      notReceived: count((r) => r.answers.trainingReceived === "No"),
    },
    riskDistribution,
    challenges: Object.entries(challenges).map(([name, value]) => ({
      name,
      value,
    })),
    villages,
  };
  res.json({ success: true, data });
}
