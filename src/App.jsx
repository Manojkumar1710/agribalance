import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, PieChart, Pie, Cell,
  ResponsiveContainer, Legend,
} from "recharts";
import {
  Leaf, Droplets, ShieldAlert, ClipboardList, Users, MapPin, AlertTriangle,
  CheckCircle2, TrendingUp, FileText, GraduationCap, Search, Sprout,
  FlaskConical, SprayCan, Printer, ArrowLeft, ChevronRight, ChevronLeft,
  RotateCcw, History, BadgeCheck, Info, X, Locate, Loader2, Navigation,
} from "lucide-react";
import { authApi, surveyApi, authStorage } from "./services/api.js";

/* =========================================================================
   1. CONFIG & CONSTANTS
   ========================================================================= */

const STORAGE_KEY = "agribalance_farmers_v3";

const VILLAGE_SEED = ["Rampur", "Anandpur", "Krishnanagar", "Sundarpur", "Devgaon"];

const RISK_COLORS = { Low: "#059669", Medium: "#d97706", High: "#e11d48" };
const YESNO_COLORS = { Yes: "#059669", No: "#e11d48" };
const CHART_PALETTE = ["#047857", "#d97706", "#0369a1", "#7c3aed", "#be185d", "#65a30d", "#78350f", "#0891b2"];

// ---- Scoring configuration. Adjust weights/thresholds here only; no other
// ---- code changes are required for the risk & priority engine to update. ----
const RISK_CONFIG = {
  fertilizer: {
    weights: {
      noSoilTest: 2,
      dealerOrFriendDecision: 2,
      neverOrganicManure: 1,
      ureaWithoutOrganicSupplement: 1,
      highCostChallenge: 1,
      noTraining: 1,
    },
    thresholds: { high: 5, medium: 3 },
  },
  pesticide: {
    weights: {
      sprayRegularly: 2,
      sprayOnDealerAdvice: 1,
      dosageNever: 3,
      dosageSometimes: 2,
      noSafetyEquipment: 2,
    },
    thresholds: { high: 5, medium: 3 },
  },
  priority: {
    weights: {
      highFertilizerRisk: 2,
      noSoilTest: 1,
      unsafePesticidePractice: 2,
      noSafetyEquipment: 1,
      noTraining: 1,
    },
    thresholds: { high: 6, medium: 3 },
  },
  villageHotspot: {
    // percentage thresholds used to tag a village metric High/Medium/Low priority
    high: 60,
    medium: 30,
  },
};

const NAV_COORDINATOR = [
  { id: "overview", label: "Overview", icon: TrendingUp },
  { id: "villages", label: "Villages", icon: MapPin },
  { id: "map", label: "Field Map", icon: Navigation },
  { id: "hotspots", label: "Hotspots", icon: AlertTriangle },
  { id: "farmers", label: "Farmers", icon: Users },
  { id: "reports", label: "Reports", icon: FileText },
  { id: "awareness", label: "Awareness", icon: GraduationCap },
];

/* =========================================================================
   2. SURVEY FORM CONFIGURATION (drives the multi-step wizard)
   ========================================================================= */

const SURVEY_STEPS = [
  {
    title: "Personal Information",
    icon: ClipboardList,
    fields: [
      { id: "date", label: "Date", type: "date", required: true },
      { id: "village", label: "Village / Location Name", type: "village_location", required: true, placeholder: "Type custom village/district or detect live GPS" },
      { id: "farmerName", label: "Farmer Name (Optional)", type: "text", placeholder: "e.g. Ramesh Yadav" },
      { id: "age", label: "Age", type: "number", required: true, placeholder: "e.g. 42" },
      { id: "gender", label: "Gender", type: "select", options: ["Male", "Female", "Other"], required: true },
      { id: "education", label: "Education", type: "select", required: true,
        options: ["No formal education", "Primary", "Secondary", "Higher Secondary", "Graduate", "Postgraduate"] },
      { id: "mobile", label: "Mobile Number (Optional)", type: "text", placeholder: "10-digit number" },
    ],
  },
  {
    title: "Farm Information",
    icon: Sprout,
    fields: [
      { id: "landSize", label: "Total Land Under Cultivation", type: "radio", required: true,
        options: ["<1 Acre", "1–3 Acres", "3–5 Acres", ">5 Acres"] },
      { id: "crops", label: "Main Crop(s) Grown", type: "text", required: true, placeholder: "e.g. Paddy, Cotton" },
      { id: "irrigation", label: "Source of Irrigation", type: "radio", required: true,
        options: ["Borewell", "Canal", "Rainwater", "Drip", "Others"] },
      { id: "experience", label: "Farming Experience", type: "radio", required: true,
        options: ["<5 Years", "5–10 Years", "10–20 Years", ">20 Years"] },
      { id: "location", label: "Farm / Survey Location (GPS)", type: "location" },
    ],
  },
  {
    title: "Fertilizer Practices",
    icon: FlaskConical,
    fields: [
      { id: "fertilizers", label: "Fertilizers Used", type: "checkbox-group", required: true,
        options: ["Urea", "DAP", "Potash", "Organic Manure", "Compost", "Others"] },
      { id: "fertilizerDecision", label: "How do you decide which fertilizer to use?", type: "radio", required: true,
        options: ["Agriculture Officer", "Dealer", "Personal Experience", "Friends", "Others"] },
      { id: "organicManureUse", label: "Do you use organic manure with chemical fertilizers?", type: "radio", required: true,
        options: ["Always", "Sometimes", "Never"] },
      { id: "soilTest", label: "Have you ever conducted a soil test?", type: "radio", required: true,
        options: ["Yes", "No"] },
    ],
  },
  {
    title: "Pesticide Practices",
    icon: SprayCan,
    fields: [
      { id: "pesticideTiming", label: "When do you spray pesticides?", type: "radio", required: true,
        options: ["Regularly", "Only when pests appear", "Dealer's advice", "Others"] },
      { id: "pesticideDosage", label: "Do you follow the recommended dosage?", type: "radio", required: true,
        options: ["Always", "Sometimes", "Never"] },
      { id: "safetyEquipment", label: "Do you use safety equipment while spraying?", type: "radio", required: true,
        options: ["Yes", "No"] },
    ],
  },
  {
    title: "Challenges & Awareness",
    icon: AlertTriangle,
    fields: [
      { id: "challenges", label: "Major Farming Challenges", type: "checkbox-group", required: true,
        options: ["High Fertilizer Cost", "Low Yield", "Pest Attacks", "Water Shortage", "Soil Fertility", "Labour", "Climate", "Others"] },
      { id: "trainingReceived", label: "Have you received training on sustainable farming?", type: "radio", required: true,
        options: ["Yes", "No"] },
      { id: "wantTraining", label: "Would you like to learn about balanced fertilizer use?", type: "radio", required: true,
        options: ["Yes", "No", "Maybe"] },
      { id: "suggestions", label: "Suggestions / Remarks", type: "textarea", placeholder: "Optional" },
    ],
  },
  {
    title: "Sign-off",
    icon: BadgeCheck,
    fields: [
      { id: "surveyedBy", label: "Survey Conducted By (Student Name)", type: "text", required: true },
      { id: "studentSignature", label: "Student Signature (type full name to confirm)", type: "text", required: true },
      { id: "farmerConsent", label: "Farmer confirms the information above is accurate. Physical signature / thumb impression is retained on the paper survey form.",
        type: "checkbox-confirm", required: true },
    ],
  },
];

/* =========================================================================
   3. RISK & RECOMMENDATION ENGINE
   ========================================================================= */

function levelFromScore(score, thresholds) {
  if (score >= thresholds.high) return "High";
  if (score >= thresholds.medium) return "Medium";
  return "Low";
}

function computeFertilizerRisk(f) {
  const w = RISK_CONFIG.fertilizer.weights;
  let score = 0;
  const reasons = [];

  if (f.soilTest === "No") {
    score += w.noSoilTest;
    reasons.push("No soil test has ever been conducted, so fertilizer choices are not based on actual soil nutrient data.");
  }
  if (f.fertilizerDecision === "Dealer" || f.fertilizerDecision === "Friends") {
    score += w.dealerOrFriendDecision;
    reasons.push(`Fertilizer selection is guided mainly by ${f.fertilizerDecision.toLowerCase()} rather than an agricultural officer or soil test.`);
  }
  if (f.organicManureUse === "Never") {
    score += w.neverOrganicManure;
    reasons.push("Organic manure is never combined with chemical fertilizers, which can reduce soil organic matter over time.");
  }
  if ((f.fertilizers || []).includes("Urea") && !(f.fertilizers || []).some(x => ["Organic Manure", "Compost"].includes(x))) {
    score += w.ureaWithoutOrganicSupplement;
    reasons.push("Urea is used without any organic supplementation such as compost or manure.");
  }
  if ((f.challenges || []).includes("High Fertilizer Cost")) {
    score += w.highCostChallenge;
    reasons.push("The farmer reports fertilizer cost as a major challenge, which is often linked to inefficient or excessive use.");
  }
  if (f.trainingReceived === "No") {
    score += w.noTraining;
    reasons.push("No prior training on sustainable fertilizer use has been received.");
  }
  if (reasons.length === 0) {
    reasons.push("Soil testing is in place, fertilizer decisions involve expert input, and organic matter is used alongside chemical fertilizers.");
  }

  return { level: levelFromScore(score, RISK_CONFIG.fertilizer.thresholds), score, reasons };
}

function computePesticideRisk(f) {
  const w = RISK_CONFIG.pesticide.weights;
  let score = 0;
  const reasons = [];

  if (f.pesticideTiming === "Regularly") {
    score += w.sprayRegularly;
    reasons.push("Pesticides are sprayed on a regular schedule rather than in response to actual pest presence.");
  }
  if (f.pesticideTiming === "Dealer's advice") {
    score += w.sprayOnDealerAdvice;
    reasons.push("Spraying decisions are based on dealer advice rather than a scouting-based assessment.");
  }
  if (f.pesticideDosage === "Never") {
    score += w.dosageNever;
    reasons.push("The recommended dosage is not followed.");
  } else if (f.pesticideDosage === "Sometimes") {
    score += w.dosageSometimes;
    reasons.push("The recommended dosage is only followed sometimes.");
  }
  if (f.safetyEquipment === "No") {
    score += w.noSafetyEquipment;
    reasons.push("No protective safety equipment is used while spraying, which is a direct health risk.");
  }
  if (reasons.length === 0) {
    reasons.push("Spraying is need-based, recommended dosage is followed, and safety equipment is used consistently.");
  }

  return { level: levelFromScore(score, RISK_CONFIG.pesticide.thresholds), score, reasons };
}

function computeSoilStatus(f) {
  if (f.soilTest === "No") {
    return {
      status: "Soil Testing Recommended",
      tested: false,
      message: "Soil testing has not been done. A soil test helps determine actual nutrient requirements and supports more balanced, evidence-based fertilizer decisions.",
    };
  }
  return {
    status: "Soil Testing Completed",
    tested: true,
    message: "A soil test has been conducted. Periodic re-testing (roughly every 2–3 years, or per local agricultural office guidance) helps keep fertilizer decisions aligned with current soil conditions.",
  };
}

function computeOverallRisk(fertRisk, pestRisk, soilStatus, f) {
  const rank = { Low: 1, Medium: 2, High: 3 };
  let num = Math.max(rank[fertRisk.level], rank[pestRisk.level]);
  if (!soilStatus.tested && f.trainingReceived === "No") num = Math.min(3, num + 1);
  const levels = ["Low", "Medium", "High"];
  return levels[num - 1];
}

function computePriorityScore(f, fertRisk, pestRisk) {
  const w = RISK_CONFIG.priority.weights;
  let score = 0;
  const factors = [];

  if (fertRisk.level === "High") { score += w.highFertilizerRisk; factors.push("High fertilizer-practice risk"); }
  if (f.soilTest === "No") { score += w.noSoilTest; factors.push("No soil test conducted"); }
  if (f.pesticideDosage !== "Always" || f.safetyEquipment === "No") {
    score += w.unsafePesticidePractice; factors.push("Unsafe pesticide practice (dosage or safety gear)");
  }
  if (f.safetyEquipment === "No") { score += w.noSafetyEquipment; factors.push("No protective equipment used"); }
  if (f.trainingReceived === "No") { score += w.noTraining; factors.push("No sustainable farming training received"); }

  return { score, level: levelFromScore(score, RISK_CONFIG.priority.thresholds), factors };
}

function generateRecommendations(f, fertRisk, pestRisk, soilStatus) {
  const recs = [];
  if (f.soilTest === "No") {
    recs.push({ category: "Soil Testing", text: "Schedule a soil test before making major fertilizer decisions. This will help identify actual nutrient needs." });
  }
  if (f.fertilizerDecision === "Dealer" || f.fertilizerDecision === "Friends") {
    recs.push({ category: "Fertilizer Selection", text: "Consider consulting an agricultural officer or a qualified agricultural expert alongside dealer or peer advice." });
  }
  if (f.organicManureUse === "Never") {
    recs.push({ category: "Organic Matter", text: "Explore integrating suitable organic sources (compost, farmyard manure) with recommended nutrient management practices." });
  }
  if (f.pesticideDosage === "Sometimes" || f.pesticideDosage === "Never") {
    recs.push({ category: "Pesticide Dosage", text: "Follow the product label and locally recommended dosage. Avoid increasing dosage without expert guidance." });
  }
  if (f.safetyEquipment === "No") {
    recs.push({ category: "Safety", text: "Use appropriate protective equipment (mask, gloves, full-sleeve clothing) while handling and spraying pesticides." });
  }
  if (f.trainingReceived === "No") {
    recs.push({ category: "Training", text: "Participate in an upcoming sustainable farming awareness/training session in your village." });
  }
  if (f.pesticideTiming === "Regularly") {
    recs.push({ category: "Pest Monitoring", text: "Move toward need-based spraying guided by regular field scouting rather than a fixed calendar schedule." });
  }
  if (fertRisk.level === "High" || pestRisk.level === "High") {
    recs.push({ category: "Expert Consultation", text: "Given the current risk level, a visit from an agricultural officer is recommended before the next cropping cycle." });
  }
  if (recs.length === 0) {
    recs.push({ category: "Keep it up", text: "Current practices reflect several sustainable habits. Continue periodic soil testing and expert consultation to maintain this." });
  }
  return recs;
}

function assessFarmer(f) {
  const fertilizerRisk = computeFertilizerRisk(f);
  const pesticideRisk = computePesticideRisk(f);
  const soilStatus = computeSoilStatus(f);
  const overallRisk = computeOverallRisk(fertilizerRisk, pesticideRisk, soilStatus, f);
  const priority = computePriorityScore(f, fertilizerRisk, pesticideRisk);
  const recommendations = generateRecommendations(f, fertilizerRisk, pesticideRisk, soilStatus);
  return { fertilizerRisk, pesticideRisk, soilStatus, overallRisk, priority, recommendations };
}

/* =========================================================================
   4. DEMO DATA
   ========================================================================= */

let __idCounter = 0;
function nextSurveyId() {
  __idCounter += 1;
  return `SUR-${String(__idCounter).padStart(4, "0")}`;
}

// Approximate real-world coordinates so the demo Field Map has something to show.
// Individual farmer pins are jittered slightly around the village center for realism.
const VILLAGE_COORDS = {
  Rampur: [27.0837, 79.0272],
  Anandpur: [26.4499, 80.3319],
  Krishnanagar: [23.4058, 88.5017],
  Sundarpur: [25.5941, 85.1376],
  Devgaon: [21.1458, 79.0882],
};
let __locSeed = 0;
function demoLocationFor(village, dateStr) {
  const center = VILLAGE_COORDS[village] || [22.9734, 78.6569]; // India centroid fallback
  __locSeed += 1;
  const jitterLat = (((__locSeed * 37) % 100) / 100 - 0.5) * 0.02;
  const jitterLng = (((__locSeed * 53) % 100) / 100 - 0.5) * 0.02;
  return {
    latitude: Math.round((center[0] + jitterLat) * 1e6) / 1e6,
    longitude: Math.round((center[1] + jitterLng) * 1e6) / 1e6,
    accuracy: 8 + (__locSeed % 15),
    capturedAt: new Date(dateStr || Date.now()).toISOString(),
  };
}

function farmerKeyFor(f) {
  if (f.mobile && f.mobile.trim()) return `mob-${f.mobile.trim()}`;
  return `nm-${(f.farmerName || "anonymous").toLowerCase().trim()}-${f.village.toLowerCase().trim()}`.replace(/\s+/g, "-");
}

function finalizeRecord(raw) {
  const assessment = assessFarmer(raw);
  const id = raw.id || nextSurveyId();
  return {
    ...raw,
    id,
    farmerKey: raw.farmerKey || farmerKeyFor(raw),
    fertilizerRisk: assessment.fertilizerRisk,
    pesticideRisk: assessment.pesticideRisk,
    soilStatus: assessment.soilStatus,
    overallRisk: assessment.overallRisk,
    priority: assessment.priority,
    recommendations: assessment.recommendations,
    trainingStatus: raw.trainingStatus || "Not Conducted",
    followUpStatus: raw.followUpStatus || "Pending",
    createdAt: raw.createdAt || Date.now(),
  };
}

function buildDemoData() {
  __idCounter = 0;
  __locSeed = 0;
  const base = (o) => {
    const merged = {
      date: "2026-06-15", village: "Rampur", farmerName: "", age: 40, gender: "Male",
      education: "Secondary", mobile: "", landSize: "1–3 Acres", crops: "Paddy",
      irrigation: "Borewell", experience: "10–20 Years", fertilizers: ["Urea", "DAP"],
      fertilizerDecision: "Dealer", organicManureUse: "Sometimes", soilTest: "No",
      pesticideTiming: "Only when pests appear", pesticideDosage: "Sometimes", safetyEquipment: "No",
      challenges: ["High Fertilizer Cost"], trainingReceived: "No", wantTraining: "Yes",
      suggestions: "", surveyedBy: "A. Kumar (Student Volunteer)", studentSignature: "A. Kumar",
      farmerConsent: true,
      ...o,
    };
    if (!merged.location) merged.location = demoLocationFor(merged.village, merged.date);
    return finalizeRecord(merged);
  };

  const records = [
    base({ farmerName: "Ramesh Yadav", mobile: "9876500001", village: "Rampur", age: 45, crops: "Paddy, Wheat",
      fertilizers: ["Urea", "DAP"], fertilizerDecision: "Dealer", organicManureUse: "Never", soilTest: "No",
      pesticideTiming: "Regularly", pesticideDosage: "Sometimes", safetyEquipment: "No",
      challenges: ["High Fertilizer Cost", "Soil Fertility"], trainingReceived: "No", wantTraining: "Yes",
      date: "2026-02-10" }),
    // Same farmer, follow-up survey 6 months later after training — shows history/comparison
    base({ farmerName: "Ramesh Yadav", mobile: "9876500001", village: "Rampur", age: 45, crops: "Paddy, Wheat",
      fertilizers: ["Urea", "DAP", "Compost"], fertilizerDecision: "Agriculture Officer", organicManureUse: "Sometimes",
      soilTest: "Yes", pesticideTiming: "Only when pests appear", pesticideDosage: "Always", safetyEquipment: "Yes",
      challenges: ["Soil Fertility"], trainingReceived: "Yes", wantTraining: "No", date: "2026-08-02" }),

    base({ farmerName: "Sita Devi", mobile: "9876500002", village: "Rampur", age: 38, gender: "Female",
      crops: "Cotton", fertilizers: ["Urea", "Potash"], fertilizerDecision: "Friends", organicManureUse: "Never",
      soilTest: "No", pesticideTiming: "Regularly", pesticideDosage: "Never", safetyEquipment: "No",
      challenges: ["Pest Attacks", "High Fertilizer Cost"], trainingReceived: "No", date: "2026-03-05" }),

    base({ farmerName: "Mohan Lal", village: "Rampur", age: 55, crops: "Sugarcane", landSize: "3–5 Acres",
      fertilizers: ["Urea", "DAP", "Organic Manure"], fertilizerDecision: "Agriculture Officer", organicManureUse: "Always",
      soilTest: "Yes", pesticideTiming: "Only when pests appear", pesticideDosage: "Always", safetyEquipment: "Yes",
      challenges: ["Water Shortage"], trainingReceived: "Yes", wantTraining: "No", date: "2026-04-12" }),

    base({ farmerName: "Geeta Kumari", village: "Anandpur", age: 33, gender: "Female", crops: "Vegetables",
      landSize: "<1 Acre", fertilizers: ["Organic Manure", "Compost"], fertilizerDecision: "Personal Experience",
      organicManureUse: "Always", soilTest: "Yes", pesticideTiming: "Only when pests appear", pesticideDosage: "Always",
      safetyEquipment: "Yes", challenges: ["Labour"], trainingReceived: "Yes", wantTraining: "Maybe", date: "2026-05-20" }),

    base({ farmerName: "Suresh Patel", village: "Anandpur", age: 48, crops: "Groundnut", fertilizers: ["Urea", "DAP"],
      fertilizerDecision: "Dealer", organicManureUse: "Sometimes", soilTest: "No", pesticideTiming: "Dealer's advice",
      pesticideDosage: "Sometimes", safetyEquipment: "No", challenges: ["Low Yield", "High Fertilizer Cost"],
      trainingReceived: "No", wantTraining: "Yes", date: "2026-03-28" }),

    base({ farmerName: "Anita Bai", village: "Anandpur", age: 29, gender: "Female", crops: "Paddy",
      fertilizers: ["Urea"], fertilizerDecision: "Friends", organicManureUse: "Never", soilTest: "No",
      pesticideTiming: "Regularly", pesticideDosage: "Never", safetyEquipment: "No",
      challenges: ["Pest Attacks", "Climate"], trainingReceived: "No", wantTraining: "Yes", date: "2026-06-01" }),

    base({ farmerName: "Devendra Singh", village: "Anandpur", age: 60, crops: "Wheat", experience: ">20 Years",
      fertilizers: ["Urea", "DAP", "Potash"], fertilizerDecision: "Personal Experience", organicManureUse: "Sometimes",
      soilTest: "No", pesticideTiming: "Only when pests appear", pesticideDosage: "Always", safetyEquipment: "No",
      challenges: ["Soil Fertility"], trainingReceived: "No", wantTraining: "Maybe", date: "2026-04-18" }),

    base({ farmerName: "Kamla Devi", village: "Krishnanagar", age: 41, gender: "Female", crops: "Paddy, Vegetables",
      fertilizers: ["Urea", "Organic Manure"], fertilizerDecision: "Agriculture Officer", organicManureUse: "Always",
      soilTest: "Yes", pesticideTiming: "Only when pests appear", pesticideDosage: "Always", safetyEquipment: "Yes",
      challenges: ["Water Shortage"], trainingReceived: "Yes", wantTraining: "No", date: "2026-02-25" }),

    base({ farmerName: "Vinod Kumar", village: "Krishnanagar", age: 37, crops: "Cotton", fertilizers: ["Urea", "DAP"],
      fertilizerDecision: "Dealer", organicManureUse: "Never", soilTest: "No", pesticideTiming: "Regularly",
      pesticideDosage: "Sometimes", safetyEquipment: "No", challenges: ["High Fertilizer Cost", "Pest Attacks"],
      trainingReceived: "No", wantTraining: "Yes", date: "2026-05-09" }),

    base({ farmerName: "Rekha Sharma", village: "Krishnanagar", age: 34, gender: "Female", crops: "Maize",
      fertilizers: ["Urea", "Compost"], fertilizerDecision: "Personal Experience", organicManureUse: "Sometimes",
      soilTest: "No", pesticideTiming: "Dealer's advice", pesticideDosage: "Sometimes", safetyEquipment: "No",
      challenges: ["Labour", "Low Yield"], trainingReceived: "No", wantTraining: "Yes", date: "2026-06-14" }),

    base({ farmerName: "Harish Chandra", village: "Krishnanagar", age: 50, crops: "Sugarcane", landSize: ">5 Acres",
      fertilizers: ["Urea", "DAP", "Potash"], fertilizerDecision: "Dealer", organicManureUse: "Never", soilTest: "No",
      pesticideTiming: "Regularly", pesticideDosage: "Never", safetyEquipment: "No",
      challenges: ["Soil Fertility", "High Fertilizer Cost"], trainingReceived: "No", wantTraining: "Yes", date: "2026-07-01" }),

    base({ farmerName: "Pooja Yadav", village: "Sundarpur", age: 30, gender: "Female", crops: "Vegetables",
      fertilizers: ["Organic Manure", "Compost"], fertilizerDecision: "Agriculture Officer", organicManureUse: "Always",
      soilTest: "Yes", pesticideTiming: "Only when pests appear", pesticideDosage: "Always", safetyEquipment: "Yes",
      challenges: ["Water Shortage"], trainingReceived: "Yes", wantTraining: "No", date: "2026-03-15" }),

    base({ farmerName: "Rajendra Prasad", village: "Sundarpur", age: 52, crops: "Paddy", fertilizers: ["Urea", "DAP"],
      fertilizerDecision: "Dealer", organicManureUse: "Sometimes", soilTest: "No", pesticideTiming: "Regularly",
      pesticideDosage: "Sometimes", safetyEquipment: "No", challenges: ["High Fertilizer Cost", "Climate"],
      trainingReceived: "No", wantTraining: "Yes", date: "2026-04-22" }),

    base({ farmerName: "Manju Kumari", village: "Sundarpur", age: 27, gender: "Female", crops: "Groundnut",
      fertilizers: ["Urea"], fertilizerDecision: "Friends", organicManureUse: "Never", soilTest: "No",
      pesticideTiming: "Dealer's advice", pesticideDosage: "Never", safetyEquipment: "No",
      challenges: ["Pest Attacks", "Low Yield"], trainingReceived: "No", wantTraining: "Yes", date: "2026-05-30" }),

    base({ farmerName: "Balram Singh", village: "Devgaon", age: 58, crops: "Wheat, Mustard", experience: ">20 Years",
      fertilizers: ["Urea", "DAP", "Organic Manure"], fertilizerDecision: "Agriculture Officer", organicManureUse: "Always",
      soilTest: "Yes", pesticideTiming: "Only when pests appear", pesticideDosage: "Always", safetyEquipment: "Yes",
      challenges: ["Labour"], trainingReceived: "Yes", wantTraining: "No", date: "2026-02-18" }),

    base({ farmerName: "Shanti Devi", village: "Devgaon", age: 44, gender: "Female", crops: "Paddy",
      fertilizers: ["Urea", "DAP"], fertilizerDecision: "Dealer", organicManureUse: "Never", soilTest: "No",
      pesticideTiming: "Regularly", pesticideDosage: "Sometimes", safetyEquipment: "No",
      challenges: ["High Fertilizer Cost", "Soil Fertility", "Water Shortage"], trainingReceived: "No",
      wantTraining: "Yes", date: "2026-06-20" }),

    base({ farmerName: "Naresh Kumar", village: "Devgaon", age: 36, crops: "Cotton", fertilizers: ["Urea", "Potash"],
      fertilizerDecision: "Personal Experience", organicManureUse: "Sometimes", soilTest: "No",
      pesticideTiming: "Only when pests appear", pesticideDosage: "Sometimes", safetyEquipment: "No",
      challenges: ["Pest Attacks"], trainingReceived: "No", wantTraining: "Maybe", date: "2026-07-11" }),
  ];

  return records.sort((a, b) => b.createdAt - a.createdAt);
}

/* =========================================================================
   5. STORAGE HOOK
   ========================================================================= */

const storageGet = async (key) => {
  if (typeof window !== "undefined" && window.storage && typeof window.storage.get === "function") {
    try {
      const res = await window.storage.get(key, true);
      if (res && res.value) return JSON.parse(res.value);
    } catch (e) {}
  }
  if (typeof localStorage !== "undefined") {
    try {
      const item = localStorage.getItem(key);
      if (item) return JSON.parse(item);
    } catch (e) {}
  }
  return null;
};

const storageSet = async (key, val) => {
  let ok = false;
  if (typeof window !== "undefined" && window.storage && typeof window.storage.set === "function") {
    try {
      await window.storage.set(key, JSON.stringify(val), true);
      ok = true;
    } catch (e) {}
  }
  if (typeof localStorage !== "undefined") {
    try {
      localStorage.setItem(key, JSON.stringify(val));
      ok = true;
    } catch (e) {}
  }
  return ok;
};

function useFarmersDB() {
  const [farmers, setFarmers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      if (!localStorage.getItem(authStorage.tokenKey)) {
        const login = await authApi.login({ email: "worker@agribalance.local", password: "AgriBalanceDemo2026!" });
        authStorage.save(login.data.token);
      }
      const response = await surveyApi.list("page=1&limit=100");
      const data = response.data || [];
      await storageSet(STORAGE_KEY, data);
      setFarmers(data);
      setLoading(false);
      return;
    } catch (apiError) {
      let data = await storageGet(STORAGE_KEY);
      if (!data) {
        data = [];
        await storageSet(STORAGE_KEY, data);
      }
      setFarmers(data || []);
      setError(`Backend unavailable; using local saved data. ${apiError.message}`);
    }
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function persist(next) {
    setFarmers(next);
    const saved = await storageSet(STORAGE_KEY, next);
    if (!saved) {
      setError("Could not save changes to local storage. Your latest change may not persist.");
    } else {
      setError(null);
    }
  }

  async function addFarmer(raw) {
    let record;
    try {
      const response = await surveyApi.create(raw);
      record = response.data;
    } catch (apiError) {
      record = finalizeRecord({ ...raw, id: `SUR-${String(farmers.length + 1).padStart(4, "0")}-${Date.now().toString().slice(-4)}` });
      setError(`Survey saved locally, but could not reach the backend. ${apiError.message}`);
    }
    const next = [record, ...farmers];
    await persist(next);
    return record;
  }

  async function updateFarmer(id, patch) {
    const next = farmers.map((f) => (f.id === id ? { ...f, ...patch } : f));
    await persist(next);
  }

  async function resetDemo() {
    await persist(buildDemoData());
  }

  async function clearAll() {
    await persist([]);
  }

  return { farmers, loading, error, addFarmer, updateFarmer, resetDemo, clearAll, reload: load };
}

/* =========================================================================
   6. SMALL UI ATOMS
   ========================================================================= */

const RISK_STYLE = {
  Low: "bg-emerald-50 text-emerald-700 border-emerald-200",
  Medium: "bg-amber-50 text-amber-700 border-amber-200",
  High: "bg-rose-50 text-rose-700 border-rose-200",
};
const RISK_DOT = { Low: "bg-emerald-500", Medium: "bg-amber-500", High: "bg-rose-500" };

function RiskBadge({ level, size = "md" }) {
  const pad = size === "sm" ? "px-2 py-0.5 text-xs" : "px-3 py-1 text-sm";
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border font-medium ${pad} ${RISK_STYLE[level] || RISK_STYLE.Low}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${RISK_DOT[level] || RISK_DOT.Low}`} />
      {level} {size !== "sm" ? "Risk" : ""}
    </span>
  );
}

function LedgerTag({ children }) {
  return (
    <span className="inline-block font-mono text-xs tracking-wider uppercase bg-white border border-stone-300 rounded px-2 py-0.5 text-stone-600">
      {children}
    </span>
  );
}

function Card({ children, className = "" }) {
  return <div className={`bg-white border border-stone-200 rounded-xl shadow-sm ${className}`}>{children}</div>;
}

function SectionHeading({ eyebrow, title, icon: Icon, action }) {
  return (
    <div className="flex items-start justify-between gap-3 mb-4">
      <div>
        {eyebrow && <div className="text-xs font-mono uppercase tracking-widest text-emerald-700 mb-1">{eyebrow}</div>}
        <h2 className="font-serif text-xl md:text-2xl text-stone-900 flex items-center gap-2">
          {Icon && <Icon className="h-5 w-5 text-emerald-700" />}
          {title}
        </h2>
      </div>
      {action}
    </div>
  );
}

function StatCard({ label, value, icon: Icon, tone = "default" }) {
  const tones = {
    default: "text-stone-900",
    danger: "text-rose-700",
    warn: "text-amber-700",
    good: "text-emerald-700",
  };
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs uppercase tracking-wide text-stone-500 font-medium">{label}</span>
        {Icon && <Icon className="h-4 w-4 text-stone-400" />}
      </div>
      <div className={`font-mono text-2xl font-semibold ${tones[tone]}`}>{value}</div>
    </Card>
  );
}

function EmptyState({ icon: Icon, title, subtitle, action }) {
  return (
    <div className="text-center py-12 px-4 bg-white border border-stone-200 rounded-xl shadow-sm my-4">
      {Icon && <Icon className="h-10 w-10 mx-auto mb-3 text-emerald-700 bg-emerald-50 p-2.5 rounded-full" />}
      <div className="font-serif text-lg text-stone-800 font-medium">{title}</div>
      {subtitle && <div className="text-sm text-stone-500 max-w-md mx-auto mt-1 mb-4">{subtitle}</div>}
      {action}
    </div>
  );
}

function DisclaimerNote({ children }) {
  return (
    <div className="flex items-start gap-2 text-xs text-stone-500 bg-stone-50 border border-stone-200 rounded-lg px-3 py-2 mt-3">
      <Info className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
      <span>{children}</span>
    </div>
  );
}

function mapsQueryUrl(lat, lng) { return `https://www.google.com/maps?q=${lat},${lng}`; }
function mapsEmbedUrl(lat, lng, zoom = 16) { return `https://www.google.com/maps?q=${lat},${lng}&z=${zoom}&output=embed`; }

function LocationView({ location, height = 200 }) {
  if (!location || typeof location.latitude !== "number" || Number.isNaN(location.latitude)) {
    return (
      <div className="text-sm text-stone-400 flex items-center gap-1.5">
        <MapPin className="h-3.5 w-3.5" /> Location not captured for this survey.
      </div>
    );
  }
  return (
    <div>
      <div className="rounded-lg overflow-hidden border border-stone-200 mb-2">
        <iframe title="Farm location map" width="100%" height={height} style={{ border: 0 }} loading="lazy"
          src={mapsEmbedUrl(location.latitude, location.longitude)} />
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-stone-500">
        <span className="font-mono">
          {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}
          {location.accuracy !== undefined && ` · ±${location.accuracy}m`}
        </span>
        <a href={mapsQueryUrl(location.latitude, location.longitude)} target="_blank" rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-emerald-700 hover:underline">
          <MapPin className="h-3 w-3" /> Open in Google Maps
        </a>
      </div>
    </div>
  );
}

function LocationTracker({ value, onChange }) {
  const [tracking, setTracking] = useState(false);
  const [status, setStatus] = useState("idle"); // idle | locating | ok | error
  const [error, setError] = useState("");
  const watchIdRef = useRef(null);

  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null && typeof navigator !== "undefined" && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);

  function applyPosition(pos) {
    onChange("location", {
      latitude: Math.round(pos.coords.latitude * 1e6) / 1e6,
      longitude: Math.round(pos.coords.longitude * 1e6) / 1e6,
      accuracy: Math.round(pos.coords.accuracy || 0),
      capturedAt: new Date().toISOString(),
    });
    setStatus("ok");
    setError("");
  }

  function handleError(err) {
    setStatus("error");
    setTracking(false);
    if (watchIdRef.current !== null && navigator.geolocation) { navigator.geolocation.clearWatch(watchIdRef.current); watchIdRef.current = null; }
    const messages = {
      1: "Location permission was denied. You can enter coordinates manually below.",
      2: "Location is currently unavailable. Try again, or enter coordinates manually.",
      3: "Location request timed out. Try again, or enter coordinates manually.",
    };
    setError((err && messages[err.code]) || "Could not access location. Enter coordinates manually below.");
  }

  function captureOnce() {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setStatus("error"); setError("This browser does not support location access. Enter coordinates manually below."); return;
    }
    setStatus("locating");
    navigator.geolocation.getCurrentPosition(applyPosition, handleError, { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 });
  }

  function toggleLiveTracking() {
    if (tracking) {
      if (watchIdRef.current !== null && navigator.geolocation) navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
      setTracking(false);
      return;
    }
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setStatus("error"); setError("This browser does not support location access. Enter coordinates manually below."); return;
    }
    setStatus("locating");
    setTracking(true);
    watchIdRef.current = navigator.geolocation.watchPosition(applyPosition, handleError, { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 });
  }

  function manualChange(key, raw) {
    const num = raw === "" ? "" : Number(raw);
    onChange("location", { ...(value || {}), [key]: num, capturedAt: (value && value.capturedAt) || new Date().toISOString(), manual: true });
  }

  const loc = value;
  const hasLoc = loc && typeof loc.latitude === "number" && typeof loc.longitude === "number" && !Number.isNaN(loc.latitude) && !Number.isNaN(loc.longitude);

  return (
    <div className="mb-5">
      <label className="block text-sm font-medium text-stone-700 mb-1.5">Farm / Survey Location (GPS)</label>
      <div className="border border-stone-300 rounded-lg p-3 bg-stone-50">
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <button type="button" onClick={captureOnce} disabled={status === "locating" && !tracking}
            className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 disabled:opacity-60 text-white">
            {status === "locating" && !tracking ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Locate className="h-3.5 w-3.5" />}
            Capture Current Location
          </button>
          <button type="button" onClick={toggleLiveTracking}
            className={`flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg border transition ${tracking ? "bg-rose-600 text-white border-rose-600" : "bg-white text-stone-700 border-stone-300 hover:border-emerald-400"}`}>
            {tracking && <span className="h-2 w-2 rounded-full bg-white animate-pulse" />}
            {tracking ? "Stop Live Tracking" : "Start Live Tracking"}
          </button>
        </div>

        {error && <div className="text-xs text-rose-600 bg-rose-50 border border-rose-200 rounded px-2.5 py-1.5 mb-3">{error}</div>}

        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <label className="block text-xs text-stone-500 mb-1">Latitude</label>
            <input type="number" step="any" value={hasLoc ? loc.latitude : ""} onChange={(e) => manualChange("latitude", e.target.value)}
              placeholder="e.g. 26.4499" className="w-full rounded-lg border border-stone-300 px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
          </div>
          <div>
            <label className="block text-xs text-stone-500 mb-1">Longitude</label>
            <input type="number" step="any" value={hasLoc ? loc.longitude : ""} onChange={(e) => manualChange("longitude", e.target.value)}
              placeholder="e.g. 80.3319" className="w-full rounded-lg border border-stone-300 px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
          </div>
        </div>

        {hasLoc ? (
          <>
            <div className="text-xs text-stone-500 mb-2 flex flex-wrap items-center gap-x-4 gap-y-1 font-mono">
              <span>{loc.latitude.toFixed(6)}, {loc.longitude.toFixed(6)}</span>
              {loc.accuracy !== undefined && <span>±{loc.accuracy}m accuracy</span>}
              {tracking && <span className="text-rose-600 font-medium flex items-center gap-1 font-sans"><span className="h-1.5 w-1.5 rounded-full bg-rose-500 animate-pulse" /> live tracking</span>}
            </div>
            <div className="rounded-lg overflow-hidden border border-stone-200">
              <iframe title="Farm location map preview" width="100%" height="180" style={{ border: 0 }} loading="lazy"
                src={mapsEmbedUrl(loc.latitude, loc.longitude)} />
            </div>
            <a href={mapsQueryUrl(loc.latitude, loc.longitude)} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-emerald-700 hover:underline mt-2">
              <MapPin className="h-3 w-3" /> Open in Google Maps
            </a>
          </>
        ) : (
          <p className="text-xs text-stone-400">No location captured yet. Use the buttons above, or type coordinates manually.</p>
        )}
      </div>
    </div>
  );
}

async function reverseGeocodeVillage(lat, lng) {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=14&addressdetails=1`
    );
    if (!response.ok) return null;
    const data = await response.json();
    const addr = data.address || {};
    const name = addr.village || addr.town || addr.suburb || addr.neighbourhood || addr.city_district || addr.city || addr.county || addr.state_district;
    if (name) return name;
    if (data.display_name) return data.display_name.split(",")[0];
    return null;
  } catch (err) {
    return null;
  }
}

function VillageLocationInput({ value, formData, onChange, farmers = [] }) {
  const [detecting, setDetecting] = useState(false);
  const [statusMsg, setStatusMsg] = useState("");
  const existingVillages = Array.from(new Set((farmers || []).map((f) => f.village).filter(Boolean))).sort();

  async function detectLiveLocation() {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setStatusMsg("Geolocation is not supported by your browser. Please type location manually.");
      return;
    }
    setDetecting(true);
    setStatusMsg("Acquiring GPS coordinates...");
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = Math.round(pos.coords.latitude * 1e6) / 1e6;
        const lng = Math.round(pos.coords.longitude * 1e6) / 1e6;
        const acc = Math.round(pos.coords.accuracy || 0);

        setStatusMsg("Detecting village name from GPS...");
        const placeName = await reverseGeocodeVillage(lat, lng);

        const locObj = {
          latitude: lat,
          longitude: lng,
          accuracy: acc,
          capturedAt: new Date().toISOString(),
          address: placeName || "Live GPS Location"
        };

        onChange("location", locObj);

        if (placeName) {
          onChange("village", placeName);
          setStatusMsg(`📍 Live GPS Detected: ${placeName} (${lat}, ${lng})`);
        } else {
          setStatusMsg(`📍 Live GPS Coordinates captured (${lat}, ${lng}). Please enter village name.`);
        }
        setDetecting(false);
      },
      (err) => {
        setDetecting(false);
        setStatusMsg("Could not fetch GPS. You can type the location manually.");
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  }

  const hasGps = formData?.location?.latitude && formData?.location?.longitude;

  return (
    <div className="mb-5">
      <div className="flex items-center justify-between gap-2 mb-1.5 flex-wrap">
        <label className="block text-sm font-medium text-stone-700">
          Village / Location Name <span className="text-rose-500">*</span>
        </label>
        <button
          type="button"
          onClick={detectLiveLocation}
          disabled={detecting}
          className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-medium disabled:opacity-50 transition shadow-sm"
        >
          {detecting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Locate className="h-3.5 w-3.5" />}
          {detecting ? "Detecting GPS..." : "Detect Live Location (GPS)"}
        </button>
      </div>

      <div className="relative">
        <input
          type="text"
          list="village-suggestions-list"
          value={value || ""}
          placeholder="Type custom village/district or click 'Detect Live Location'"
          onChange={(e) => onChange("village", e.target.value)}
          className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white"
        />
        <datalist id="village-suggestions-list">
          {existingVillages.map((v) => (
            <option key={v} value={v} />
          ))}
        </datalist>
      </div>

      {existingVillages.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 mt-2">
          <span className="text-xs text-stone-400">Select existing location:</span>
          {existingVillages.map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => onChange("village", v)}
              className={`text-xs px-2.5 py-1 rounded-md border transition ${
                value === v ? "bg-emerald-700 text-white border-emerald-700 font-medium" : "bg-white text-stone-600 border-stone-200 hover:bg-stone-50"
              }`}
            >
              {v}
            </button>
          ))}
        </div>
      )}

      {statusMsg && (
        <p className={`text-xs mt-1.5 ${hasGps ? "text-emerald-700 font-medium" : "text-amber-700"}`}>
          {statusMsg}
        </p>
      )}

      {hasGps && (
        <div className="mt-2 text-xs bg-emerald-50 border border-emerald-200 rounded-lg p-2.5 flex items-center justify-between text-emerald-800">
          <span className="flex items-center gap-1.5 font-mono">
            <MapPin className="h-3.5 w-3.5 text-emerald-700 flex-shrink-0" />
            GPS: {formData.location.latitude.toFixed(5)}, {formData.location.longitude.toFixed(5)} (±{formData.location.accuracy || 0}m)
          </span>
          <span className="text-[11px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-medium">Live Captured</span>
        </div>
      )}
    </div>
  );
}

function Field({ field, value, formData, onChange, farmers }) {
  const labelEl = (
    <label className="block text-sm font-medium text-stone-700 mb-1.5">
      {field.label}{field.required && <span className="text-rose-500 ml-0.5">*</span>}
    </label>
  );
  const baseInput = "w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white";

  if (field.type === "village_location" || field.id === "village") {
    return <VillageLocationInput value={value} formData={formData} onChange={onChange} farmers={farmers} />;
  }

  if (field.type === "text" || field.type === "date" || field.type === "number") {
    return (
      <div className="mb-5">
        {labelEl}
        <input type={field.type} value={value || ""} placeholder={field.placeholder || ""}
          onChange={(e) => onChange(field.id, e.target.value)} className={baseInput} />
      </div>
    );
  }
  if (field.type === "select") {
    return (
      <div className="mb-5">
        {labelEl}
        <select value={value || ""} onChange={(e) => onChange(field.id, e.target.value)} className={baseInput}>
          <option value="">Select…</option>
          {field.options.map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
      </div>
    );
  }
  if (field.type === "radio") {
    return (
      <div className="mb-5">
        {labelEl}
        <div className="flex flex-wrap gap-2">
          {field.options.map((o) => (
            <button type="button" key={o} onClick={() => onChange(field.id, o)}
              className={`px-3 py-1.5 rounded-full text-sm border transition ${value === o ? "bg-emerald-700 text-white border-emerald-700" : "bg-white text-stone-700 border-stone-300 hover:border-emerald-400"}`}>
              {o}
            </button>
          ))}
        </div>
      </div>
    );
  }
  if (field.type === "checkbox-group") {
    const arr = value || [];
    const toggle = (o) => onChange(field.id, arr.includes(o) ? arr.filter((x) => x !== o) : [...arr, o]);
    return (
      <div className="mb-5">
        {labelEl}
        <div className="flex flex-wrap gap-2">
          {field.options.map((o) => (
            <button type="button" key={o} onClick={() => toggle(o)}
              className={`px-3 py-1.5 rounded-full text-sm border transition ${arr.includes(o) ? "bg-emerald-700 text-white border-emerald-700" : "bg-white text-stone-700 border-stone-300 hover:border-emerald-400"}`}>
              {o}
            </button>
          ))}
        </div>
      </div>
    );
  }
  if (field.type === "textarea") {
    return (
      <div className="mb-5">
        {labelEl}
        <textarea value={value || ""} placeholder={field.placeholder || ""} rows={3}
          onChange={(e) => onChange(field.id, e.target.value)} className={baseInput} />
      </div>
    );
  }
  if (field.type === "checkbox-confirm") {
    return (
      <div className="mb-5 flex items-start gap-2.5 bg-amber-50 border border-amber-200 rounded-lg p-3">
        <input type="checkbox" checked={!!value} onChange={(e) => onChange(field.id, e.target.checked)} className="mt-1 h-4 w-4" />
        <label className="text-sm text-stone-700">{field.label}</label>
      </div>
    );
  }
  if (field.type === "location") {
    return <LocationTracker value={value} onChange={onChange} />;
  }
  return null;
}

function isStepValid(step, data) {
  for (const f of step.fields) {
    if (!f.required) continue;
    const v = data[f.id];
    if (f.type === "checkbox-group") { if (!v || v.length === 0) return false; }
    else if (f.type === "checkbox-confirm") { if (!v) return false; }
    else if (v === undefined || v === null || String(v).trim() === "") return false;
  }
  return true;
}

/* =========================================================================
   7. ANALYTICS HELPERS (village / global aggregation)
   ========================================================================= */

function pct(part, total) { return total === 0 ? 0 : Math.round((part / total) * 100); }

function distribution(list, getValue) {
  const counts = {};
  list.forEach((item) => {
    const v = getValue(item);
    const arr = Array.isArray(v) ? v : [v];
    arr.forEach((x) => { if (x !== undefined && x !== null && x !== "") counts[x] = (counts[x] || 0) + 1; });
  });
  return Object.entries(counts).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
}

function computeVillageStats(farmers, village) {
  const list = farmers.filter((f) => f.village === village);
  const total = list.length;
  const soilTestNo = list.filter((f) => f.soilTest === "No").length;
  const dealerDecision = list.filter((f) => f.fertilizerDecision === "Dealer" || f.fertilizerDecision === "Friends").length;
  const dosageNonCompliant = list.filter((f) => f.pesticideDosage !== "Always").length;
  const noSafety = list.filter((f) => f.safetyEquipment === "No").length;
  const noTraining = list.filter((f) => f.trainingReceived === "No").length;
  const riskCounts = { Low: 0, Medium: 0, High: 0 };
  list.forEach((f) => { riskCounts[f.overallRisk] = (riskCounts[f.overallRisk] || 0) + 1; });
  const avgPriority = total ? (list.reduce((s, f) => s + f.priority.score, 0) / total) : 0;

  return {
    village, total,
    crops: distribution(list, (f) => (f.crops || "").split(",").map((c) => c.trim()).filter(Boolean)).slice(0, 5),
    soilTestNoPct: pct(soilTestNo, total),
    dealerDecisionPct: pct(dealerDecision, total),
    dosageNonCompliantPct: pct(dosageNonCompliant, total),
    noSafetyPct: pct(noSafety, total),
    noTrainingPct: pct(noTraining, total),
    fertilizerUsage: distribution(list, (f) => f.fertilizers),
    challenges: distribution(list, (f) => f.challenges),
    riskCounts,
    avgPriority: Math.round(avgPriority * 10) / 10,
  };
}

function tagPriority(percentage) {
  const t = RISK_CONFIG.villageHotspot;
  if (percentage >= t.high) return "High";
  if (percentage >= t.medium) return "Medium";
  return "Low";
}

function computeHotspots(farmers) {
  const villages = Array.from(new Set(farmers.map((f) => f.village))).sort();
  const rows = villages.map((v) => {
    const s = computeVillageStats(farmers, v);
    const soilTestingPriority = tagPriority(s.soilTestNoPct);
    const pesticideSafetyPriority = tagPriority(Math.round((s.dosageNonCompliantPct + s.noSafetyPct) / 2));
    const fertilizerAwarenessPriority = tagPriority(s.dealerDecisionPct);
    const trainingPriority = tagPriority(s.noTrainingPct);
    const tags = [soilTestingPriority, pesticideSafetyPriority, fertilizerAwarenessPriority, trainingPriority];
    const score = tags.reduce((sum, t) => sum + (t === "High" ? 2 : t === "Medium" ? 1 : 0), 0);
    return { village: v, stats: s, soilTestingPriority, pesticideSafetyPriority, fertilizerAwarenessPriority, trainingPriority, score };
  });
  return rows.sort((a, b) => b.score - a.score);
}

/* =========================================================================
   8. CHART WRAPPERS
   ========================================================================= */

function DistBarChart({ data, color = "#047857", height = 220 }) {
  if (!data.length) return <EmptyState title="No data yet" />;
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} layout="vertical" margin={{ left: 8, right: 16, top: 4, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" horizontal={false} />
        <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11, fill: "#78716c" }} />
        <YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 11, fill: "#44403c" }} />
        <Tooltip />
        <Bar dataKey="value" fill={color} radius={[0, 4, 4, 0]} barSize={16} />
      </BarChart>
    </ResponsiveContainer>
  );
}

function DistPieChart({ data, colors, height = 220 }) {
  if (!data.length) return <EmptyState title="No data yet" />;
  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={75} label={({ name, value }) => `${name}: ${value}`}>
          {data.map((entry, i) => (
            <Cell key={entry.name} fill={colors ? (colors[entry.name] || CHART_PALETTE[i % CHART_PALETTE.length]) : CHART_PALETTE[i % CHART_PALETTE.length]} />
          ))}
        </Pie>
        <Tooltip />
        <Legend wrapperStyle={{ fontSize: 12 }} />
      </PieChart>
    </ResponsiveContainer>
  );
}

/* =========================================================================
   9. FARMER DASHBOARD (used by Surveyor result screen + Farmer role)
   ========================================================================= */

function FarmerDashboard({ farmer, history = [] }) {
  const f = farmer;
  return (
    <div className="space-y-5">
      <Card className="p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="text-xs uppercase tracking-widest text-stone-500 font-mono mb-1">Survey {f.id}</div>
            <h3 className="font-serif text-2xl text-stone-900">{f.farmerName || "Farmer (name withheld)"}</h3>
            <div className="text-sm text-stone-600 mt-1 flex flex-wrap gap-x-4 gap-y-1">
              <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> {f.village}</span>
              <span>Crop: {f.crops}</span>
              <span>Land: {f.landSize}</span>
              <span>Surveyed: {f.date}</span>
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs text-stone-500 mb-1">Overall Practice Status</div>
            <RiskBadge level={f.overallRisk} />
          </div>
        </div>
      </Card>

      <Card className="p-4">
        <div className="flex items-center gap-1.5 mb-2 text-sm font-medium text-stone-700"><MapPin className="h-4 w-4 text-emerald-700" /> Farm Location</div>
        <LocationView location={f.location} />
      </Card>

      <div className="grid sm:grid-cols-2 gap-4">
        <Card className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-stone-700 flex items-center gap-1.5"><FlaskConical className="h-4 w-4 text-emerald-700" /> Fertilizer Risk</span>
            <RiskBadge level={f.fertilizerRisk.level} size="sm" />
          </div>
          <ul className="text-sm text-stone-600 space-y-1 list-disc list-inside">
            {f.fertilizerRisk.reasons.map((r, i) => <li key={i}>{r}</li>)}
          </ul>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-stone-700 flex items-center gap-1.5"><SprayCan className="h-4 w-4 text-emerald-700" /> Pesticide Safety Risk</span>
            <RiskBadge level={f.pesticideRisk.level} size="sm" />
          </div>
          <ul className="text-sm text-stone-600 space-y-1 list-disc list-inside">
            {f.pesticideRisk.reasons.map((r, i) => <li key={i}>{r}</li>)}
          </ul>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-stone-700 flex items-center gap-1.5"><Droplets className="h-4 w-4 text-emerald-700" /> Soil Testing Status</span>
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${f.soilStatus.tested ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-amber-50 text-amber-700 border-amber-200"}`}>
              {f.soilStatus.status}
            </span>
          </div>
          <p className="text-sm text-stone-600">{f.soilStatus.message}</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-stone-700 flex items-center gap-1.5"><GraduationCap className="h-4 w-4 text-emerald-700" /> Sustainability Awareness</span>
          </div>
          <p className="text-sm text-stone-600">
            Training received: <strong>{f.trainingReceived}</strong>. Interested in learning more: <strong>{f.wantTraining}</strong>.
            Current training follow-up status: <strong>{f.trainingStatus}</strong>.
          </p>
        </Card>
      </div>

      <Card className="p-5">
        <h4 className="font-serif text-lg text-stone-900 mb-3">Your Key Concerns</h4>
        <div className="flex flex-wrap gap-2">
          {!f.soilStatus.tested && <LedgerTag>Soil testing</LedgerTag>}
          {(f.fertilizerDecision === "Dealer" || f.fertilizerDecision === "Friends") && <LedgerTag>Fertilizer selection</LedgerTag>}
          {f.pesticideDosage !== "Always" && <LedgerTag>Pesticide dosage</LedgerTag>}
          {f.safetyEquipment === "No" && <LedgerTag>Safety equipment</LedgerTag>}
          {f.trainingReceived === "No" && <LedgerTag>Sustainable farming training</LedgerTag>}
        </div>
      </Card>

      <Card className="p-5">
        <h4 className="font-serif text-lg text-stone-900 mb-3">Recommended Actions</h4>
        <div className="space-y-2.5">
          {f.recommendations.map((r, i) => (
            <div key={i} className="flex items-start gap-2.5 text-sm">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 mt-0.5 flex-shrink-0" />
              <div><span className="font-medium text-stone-800">{r.category}: </span><span className="text-stone-600">{r.text}</span></div>
            </div>
          ))}
        </div>
        <DisclaimerNote>
          These are general, screening-level recommendations generated from your survey answers — not a laboratory soil
          diagnosis or an exact fertilizer/pesticide dosage. For crop- or soil-specific decisions, please consult your
          local Agricultural Officer.
        </DisclaimerNote>
      </Card>

      {history.length > 1 && (
        <Card className="p-5">
          <h4 className="font-serif text-lg text-stone-900 mb-3 flex items-center gap-2"><History className="h-4 w-4 text-emerald-700" /> Survey History</h4>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-stone-500 border-b border-stone-200">
                  <th className="py-1.5 pr-4">Date</th><th className="py-1.5 pr-4">Survey ID</th>
                  <th className="py-1.5 pr-4">Overall Risk</th><th className="py-1.5 pr-4">Soil Test</th><th className="py-1.5">Training</th>
                </tr>
              </thead>
              <tbody>
                {history.map((h) => (
                  <tr key={h.id} className={`border-b border-stone-100 ${h.id === f.id ? "bg-emerald-50/50" : ""}`}>
                    <td className="py-1.5 pr-4">{h.date}</td>
                    <td className="py-1.5 pr-4 font-mono text-xs">{h.id}</td>
                    <td className="py-1.5 pr-4"><RiskBadge level={h.overallRisk} size="sm" /></td>
                    <td className="py-1.5 pr-4">{h.soilTest}</td>
                    <td className="py-1.5">{h.trainingReceived}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}

/* =========================================================================
   10. SURVEYOR: SURVEY FORM
   ========================================================================= */

function SurveyForm({ onSubmitted, farmerCount, farmers = [] }) {
  const [stepIndex, setStepIndex] = useState(0);
  const [data, setData] = useState({ date: new Date().toISOString().slice(0, 10) });
  const [attempted, setAttempted] = useState(false);
  const [submitted, setSubmitted] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const step = SURVEY_STEPS[stepIndex];
  const StepIcon = step.icon;
  const valid = isStepValid(step, data);

  function onChange(id, value) { setData((d) => ({ ...d, [id]: value })); }

  function next() {
    if (!valid) { setAttempted(true); return; }
    setAttempted(false);
    setStepIndex((i) => Math.min(i + 1, SURVEY_STEPS.length - 1));
  }
  function back() { setAttempted(false); setStepIndex((i) => Math.max(i - 1, 0)); }

  async function submit() {
    if (!valid) { setAttempted(true); return; }
    setSubmitting(true);
    const record = await onSubmitted(data);
    setSubmitting(false);
    setSubmitted(record);
  }

  function startAnother() {
    setSubmitted(null);
    setData({ date: new Date().toISOString().slice(0, 10) });
    setStepIndex(0);
    setAttempted(false);
  }

  if (submitted) {
    return (
      <div>
        <div className="flex items-center gap-2 text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-3 mb-5">
          <CheckCircle2 className="h-5 w-5 flex-shrink-0" />
          <span className="text-sm font-medium">Survey {submitted.id} submitted and analyzed. Results below are also visible on the Coordinator dashboard.</span>
        </div>
        <FarmerDashboard farmer={submitted} />
        <button onClick={startAnother} className="mt-5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg px-4 py-2.5 text-sm font-medium">
          Start Another Survey
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-2 overflow-x-auto pb-3 mb-5 -mx-1 px-1">
        {SURVEY_STEPS.map((s, i) => (
          <div key={s.title} className={`flex items-center gap-1.5 flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border ${i === stepIndex ? "bg-emerald-700 text-white border-emerald-700" : i < stepIndex ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-white text-stone-400 border-stone-200"}`}>
            <span className="font-mono">{i + 1}</span> {s.title}
          </div>
        ))}
      </div>

      <Card className="p-5 md:p-6">
        <div className="flex items-center gap-2 mb-5">
          <StepIcon className="h-5 w-5 text-emerald-700" />
          <h3 className="font-serif text-xl text-stone-900">{step.title}</h3>
        </div>

        {step.fields.map((f) => <Field key={f.id} field={f} value={data[f.id]} formData={data} onChange={onChange} farmers={farmers} />)}

        {attempted && !valid && (
          <div className="text-sm text-rose-600 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2 mb-4">
            Please complete all required fields before continuing.
          </div>
        )}

        <div className="flex items-center justify-between pt-2 border-t border-stone-100">
          <button onClick={back} disabled={stepIndex === 0}
            className="flex items-center gap-1 text-sm px-3 py-2 rounded-lg text-stone-600 disabled:opacity-30 hover:bg-stone-100">
            <ChevronLeft className="h-4 w-4" /> Back
          </button>
          {stepIndex < SURVEY_STEPS.length - 1 ? (
            <button onClick={next} className="flex items-center gap-1 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg px-4 py-2 text-sm font-medium">
              Next <ChevronRight className="h-4 w-4" />
            </button>
          ) : (
            <button onClick={submit} disabled={submitting} className="flex items-center gap-1 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-60 text-white rounded-lg px-4 py-2 text-sm font-medium">
              {submitting ? "Analyzing…" : "Submit & Analyze"}
            </button>
          )}
        </div>
      </Card>
      <p className="text-xs text-stone-400 mt-3 font-mono">Survey #{farmerCount + 1} for this session · Field team data is shared with all coordinators.</p>
    </div>
  );
}

/* =========================================================================
   11. FARMER ROLE: SELF-LOOKUP
   ========================================================================= */

function FarmerSelfLookup({ farmers }) {
  const [query, setQuery] = useState("");
  const [selectedKey, setSelectedKey] = useState(null);

  const matches = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.trim().toLowerCase();
    const seen = new Set();
    return farmers.filter((f) => {
      const hit = f.id.toLowerCase().includes(q) || (f.mobile || "").includes(q) || (f.farmerName || "").toLowerCase().includes(q) || f.village.toLowerCase().includes(q);
      if (!hit) return false;
      if (seen.has(f.farmerKey)) return false;
      seen.add(f.farmerKey);
      return true;
    }).slice(0, 8);
  }, [query, farmers]);

  const activeFarmerKey = selectedKey || (matches[0] && matches[0].farmerKey);
  const history = useMemo(() => farmers.filter((f) => f.farmerKey === activeFarmerKey).sort((a, b) => new Date(a.date) - new Date(b.date)), [farmers, activeFarmerKey]);
  const latest = history[history.length - 1];

  return (
    <div>
      <Card className="p-5 mb-5">
        <SectionHeading eyebrow="Farmer Access" title="Find My Report" icon={Search} />
        <p className="text-sm text-stone-600 mb-4">Search using your Survey ID, mobile number, name, or village to view your practice assessment and recommendations.</p>
        <div className="relative">
          <Search className="h-4 w-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input value={query} onChange={(e) => { setQuery(e.target.value); setSelectedKey(null); }}
            placeholder="e.g. SUR-0001, 98765xxxxx, Ramesh Yadav, Rampur"
            className="w-full rounded-lg border border-stone-300 pl-9 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
        </div>
        {query.trim() && matches.length > 1 && (
          <div className="flex flex-wrap gap-2 mt-3">
            {matches.map((m) => (
              <button key={m.farmerKey} onClick={() => setSelectedKey(m.farmerKey)}
                className={`text-xs px-3 py-1.5 rounded-full border ${activeFarmerKey === m.farmerKey ? "bg-emerald-700 text-white border-emerald-700" : "bg-white text-stone-600 border-stone-300"}`}>
                {m.farmerName || m.id} · {m.village}
              </button>
            ))}
          </div>
        )}
      </Card>

      {query.trim() && !latest && <EmptyState icon={Search} title="No matching survey found" subtitle="Check the spelling or ask your surveyor for your Survey ID." />}
      {latest && <FarmerDashboard farmer={latest} history={history} />}
    </div>
  );
}

/* =========================================================================
   12. COORDINATOR: OVERVIEW
   ========================================================================= */

function CoordinatorOverview({ farmers, onReset, onClear }) {
  const total = farmers.length;
  const villages = new Set(farmers.map((f) => f.village)).size;
  const acres = farmers.length; // acreage is a bracketed range in survey data, not a raw number — see note below
  const ureaUsers = farmers.filter((f) => (f.fertilizers || []).includes("Urea")).length;
  const noSoilTest = farmers.filter((f) => f.soilTest === "No").length;
  const highFert = farmers.filter((f) => f.fertilizerRisk.level === "High").length;
  const highPest = farmers.filter((f) => f.pesticideRisk.level === "High").length;
  const noSafety = farmers.filter((f) => f.safetyEquipment === "No").length;
  const wantTraining = farmers.filter((f) => f.wantTraining === "Yes").length;

  const riskDist = ["Low", "Medium", "High"].map((l) => ({ name: l, value: farmers.filter((f) => f.overallRisk === l).length }));
  const villageCompare = Array.from(new Set(farmers.map((f) => f.village))).map((v) => ({
    name: v, value: computeVillageStats(farmers, v).avgPriority,
  })).sort((a, b) => b.value - a.value);

  return (
    <div className="space-y-6">
      <SectionHeading eyebrow="CSP Field Intelligence" title="Program Overview" icon={TrendingUp}
        action={
          <div className="flex flex-wrap items-center gap-2">
            {farmers.length > 0 && (
              <button onClick={onClear} className="flex items-center gap-1.5 text-xs text-rose-600 hover:text-rose-700 bg-rose-50 border border-rose-200 hover:border-rose-300 rounded-lg px-3 py-1.5 font-medium transition">
                <X className="h-3.5 w-3.5" /> Clear Sample Data (Start Fresh)
              </button>
            )}
            <button onClick={onReset} className="flex items-center gap-1.5 text-xs text-stone-600 hover:text-emerald-700 bg-white border border-stone-200 hover:border-emerald-300 rounded-lg px-3 py-1.5 font-medium transition">
              <RotateCcw className="h-3.5 w-3.5" /> Restore Sample Data
            </button>
          </div>
        } />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Farmers Surveyed" value={total} icon={Users} />
        <StatCard label="Villages Covered" value={villages} icon={MapPin} />
        <StatCard label="Using Urea" value={`${ureaUsers} (${pct(ureaUsers, total)}%)`} icon={FlaskConical} />
        <StatCard label="Never Soil Tested" value={`${noSoilTest} (${pct(noSoilTest, total)}%)`} icon={Droplets} tone="warn" />
        <StatCard label="High Fertilizer Risk" value={highFert} icon={AlertTriangle} tone="danger" />
        <StatCard label="High Pesticide Risk" value={highPest} icon={ShieldAlert} tone="danger" />
        <StatCard label="No Safety Equipment" value={`${noSafety} (${pct(noSafety, total)}%)`} icon={SprayCan} tone="warn" />
        <StatCard label="Want Training" value={`${wantTraining} (${pct(wantTraining, total)}%)`} icon={GraduationCap} tone="good" />
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <Card className="p-4">
          <h4 className="text-sm font-medium text-stone-700 mb-3">Fertilizer Usage Distribution</h4>
          <DistBarChart data={distribution(farmers, (f) => f.fertilizers)} color="#047857" />
        </Card>
        <Card className="p-4">
          <h4 className="text-sm font-medium text-stone-700 mb-3">Soil Testing Status</h4>
          <DistPieChart data={distribution(farmers, (f) => (f.soilTest === "Yes" ? "Tested" : "Not Tested"))} colors={{ Tested: YESNO_COLORS.Yes, "Not Tested": YESNO_COLORS.No }} />
        </Card>
        <Card className="p-4">
          <h4 className="text-sm font-medium text-stone-700 mb-3">Pesticide Spraying Practices</h4>
          <DistBarChart data={distribution(farmers, (f) => f.pesticideTiming)} color="#0369a1" />
        </Card>
        <Card className="p-4">
          <h4 className="text-sm font-medium text-stone-700 mb-3">Recommended Dosage Compliance</h4>
          <DistPieChart data={distribution(farmers, (f) => f.pesticideDosage)} colors={{ Always: "#059669", Sometimes: "#d97706", Never: "#e11d48" }} />
        </Card>
        <Card className="p-4">
          <h4 className="text-sm font-medium text-stone-700 mb-3">Safety Equipment Usage</h4>
          <DistPieChart data={distribution(farmers, (f) => (f.safetyEquipment === "Yes" ? "Uses Equipment" : "No Equipment"))} colors={{ "Uses Equipment": YESNO_COLORS.Yes, "No Equipment": YESNO_COLORS.No }} />
        </Card>
        <Card className="p-4">
          <h4 className="text-sm font-medium text-stone-700 mb-3">Training Awareness</h4>
          <DistPieChart data={distribution(farmers, (f) => (f.trainingReceived === "Yes" ? "Trained" : "Not Trained"))} colors={{ Trained: YESNO_COLORS.Yes, "Not Trained": YESNO_COLORS.No }} />
        </Card>
        <Card className="p-4">
          <h4 className="text-sm font-medium text-stone-700 mb-3">Major Farming Challenges</h4>
          <DistBarChart data={distribution(farmers, (f) => f.challenges)} color="#be185d" />
        </Card>
        <Card className="p-4">
          <h4 className="text-sm font-medium text-stone-700 mb-3">Overall Risk Distribution</h4>
          <DistPieChart data={riskDist} colors={RISK_COLORS} />
        </Card>
        <Card className="p-4 md:col-span-2">
          <h4 className="text-sm font-medium text-stone-700 mb-3">Village Comparison — Avg. Priority Score</h4>
          <DistBarChart data={villageCompare} color="#7c3aed" height={Math.max(160, villageCompare.length * 42)} />
        </Card>
      </div>
    </div>
  );
}

/* =========================================================================
   13. COORDINATOR: VILLAGES
   ========================================================================= */

function CoordinatorVillages({ farmers }) {
  const villages = useMemo(() => Array.from(new Set(farmers.map((f) => f.village))).sort(), [farmers]);
  const [selected, setSelected] = useState(villages[0] || "");
  useEffect(() => { if (!villages.includes(selected)) setSelected(villages[0] || ""); }, [villages]); // eslint-disable-line

  if (!villages.length) return <EmptyState icon={MapPin} title="No village data yet" />;
  const s = computeVillageStats(farmers, selected);

  return (
    <div className="space-y-5">
      <SectionHeading eyebrow="Community-Level Insight" title="Village-Level Analysis" icon={MapPin} />

      <div className="flex flex-wrap gap-2">
        {villages.map((v) => (
          <button key={v} onClick={() => setSelected(v)}
            className={`px-3.5 py-1.5 rounded-full text-sm border ${selected === v ? "bg-emerald-700 text-white border-emerald-700" : "bg-white text-stone-700 border-stone-300"}`}>
            {v}
          </button>
        ))}
      </div>

      <Card className="p-5">
        <div className="flex flex-wrap items-baseline justify-between gap-2 mb-4">
          <h3 className="font-serif text-2xl text-stone-900">Village: {selected}</h3>
          <span className="text-sm text-stone-500 font-mono">{s.total} farmers surveyed</span>
        </div>
        <div className="grid sm:grid-cols-2 gap-2.5 text-sm">
          <div className="flex items-center gap-2 bg-stone-50 rounded-lg px-3 py-2"><Droplets className="h-4 w-4 text-amber-600 flex-shrink-0" /><span><strong>{s.soilTestNoPct}%</strong> have never conducted soil testing</span></div>
          <div className="flex items-center gap-2 bg-stone-50 rounded-lg px-3 py-2"><FlaskConical className="h-4 w-4 text-amber-600 flex-shrink-0" /><span><strong>{s.dealerDecisionPct}%</strong> rely on dealer/friend advice for fertilizer</span></div>
          <div className="flex items-center gap-2 bg-stone-50 rounded-lg px-3 py-2"><SprayCan className="h-4 w-4 text-amber-600 flex-shrink-0" /><span><strong>{s.dosageNonCompliantPct}%</strong> do not consistently follow pesticide dosage</span></div>
          <div className="flex items-center gap-2 bg-stone-50 rounded-lg px-3 py-2"><ShieldAlert className="h-4 w-4 text-amber-600 flex-shrink-0" /><span><strong>{s.noSafetyPct}%</strong> do not use safety equipment</span></div>
          <div className="flex items-center gap-2 bg-stone-50 rounded-lg px-3 py-2"><GraduationCap className="h-4 w-4 text-amber-600 flex-shrink-0" /><span><strong>{s.noTrainingPct}%</strong> have not received sustainable-farming training</span></div>
          <div className="flex items-center gap-2 bg-stone-50 rounded-lg px-3 py-2"><TrendingUp className="h-4 w-4 text-amber-600 flex-shrink-0" /><span>Avg. priority score: <strong>{s.avgPriority}</strong></span></div>
        </div>
        <DisclaimerNote>All percentages are calculated live from the survey records currently stored for this village.</DisclaimerNote>
      </Card>

      <div className="grid md:grid-cols-3 gap-4">
        <Card className="p-4">
          <h4 className="text-sm font-medium text-stone-700 mb-3">Common Crops</h4>
          <DistBarChart data={s.crops} color="#65a30d" height={160} />
        </Card>
        <Card className="p-4">
          <h4 className="text-sm font-medium text-stone-700 mb-3">Fertilizer Usage</h4>
          <DistBarChart data={s.fertilizerUsage} color="#047857" height={160} />
        </Card>
        <Card className="p-4">
          <h4 className="text-sm font-medium text-stone-700 mb-3">Risk Distribution</h4>
          <DistPieChart data={["Low", "Medium", "High"].map((l) => ({ name: l, value: s.riskCounts[l] || 0 }))} colors={RISK_COLORS} height={160} />
        </Card>
        <Card className="p-4 md:col-span-3">
          <h4 className="text-sm font-medium text-stone-700 mb-3">Major Farming Challenges</h4>
          <DistBarChart data={s.challenges} color="#be185d" height={180} />
        </Card>
      </div>
    </div>
  );
}

/* =========================================================================
   13b. COORDINATOR: FIELD MAP (GPS locations captured during surveys)
   ========================================================================= */

function CoordinatorFieldMap({ farmers }) {
  const withLoc = useMemo(
    () => farmers.filter((f) => f.location && typeof f.location.latitude === "number" && !Number.isNaN(f.location.latitude)),
    [farmers]
  );
  const villages = useMemo(() => Array.from(new Set(withLoc.map((f) => f.village))).sort(), [withLoc]);
  const [selected, setSelected] = useState(villages[0] || "");
  useEffect(() => { if (!villages.includes(selected)) setSelected(villages[0] || ""); }, [villages]); // eslint-disable-line

  if (!withLoc.length) {
    return (
      <div className="space-y-5">
        <SectionHeading eyebrow="GPS Coverage" title="Field Map" icon={Navigation} />
        <EmptyState icon={Navigation} title="No GPS-tagged surveys yet"
          subtitle="Locations captured on the Farm Information step of a survey (or entered manually) will appear here." />
      </div>
    );
  }

  const villageFarmers = withLoc.filter((f) => f.village === selected);
  const avgLat = villageFarmers.reduce((s, f) => s + f.location.latitude, 0) / (villageFarmers.length || 1);
  const avgLng = villageFarmers.reduce((s, f) => s + f.location.longitude, 0) / (villageFarmers.length || 1);

  return (
    <div className="space-y-5">
      <SectionHeading eyebrow={`${withLoc.length} of ${farmers.length} surveys GPS-tagged`} title="Field Map" icon={Navigation} />

      <div className="flex flex-wrap gap-2">
        {villages.map((v) => (
          <button key={v} onClick={() => setSelected(v)}
            className={`px-3.5 py-1.5 rounded-full text-sm border ${selected === v ? "bg-emerald-700 text-white border-emerald-700" : "bg-white text-stone-700 border-stone-300"}`}>
            {v}
          </button>
        ))}
      </div>

      <Card className="p-4">
        <div className="rounded-lg overflow-hidden border border-stone-200 mb-3">
          <iframe title="Village field map" width="100%" height="320" style={{ border: 0 }} loading="lazy"
            src={mapsEmbedUrl(avgLat, avgLng, 14)} />
        </div>
        <p className="text-xs text-stone-400 mb-3">
          Map centered on the average GPS location of {villageFarmers.length} surveyed farm(s) in {selected}. Individual coordinates below.
        </p>
        <div className="divide-y divide-stone-100">
          {villageFarmers.map((f) => (
            <div key={f.id} className="flex items-center justify-between gap-3 py-2 text-sm">
              <div>
                <div className="font-medium text-stone-800">
                  {f.farmerName || "Unnamed"} <span className="text-xs text-stone-400 font-mono">{f.id}</span>
                </div>
                <div className="text-xs text-stone-500 font-mono">{f.location.latitude.toFixed(5)}, {f.location.longitude.toFixed(5)}</div>
              </div>
              <a href={mapsQueryUrl(f.location.latitude, f.location.longitude)} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1 text-xs text-emerald-700 hover:underline flex-shrink-0">
                <MapPin className="h-3 w-3" /> Open
              </a>
            </div>
          ))}
        </div>
      </Card>

      {withLoc.length < farmers.length && (
        <DisclaimerNote>{farmers.length - withLoc.length} survey(s) don't have a captured GPS location yet.</DisclaimerNote>
      )}
    </div>
  );
}

/* =========================================================================
   14. COORDINATOR: HOTSPOTS
   ========================================================================= */

function PriorityDot({ level }) {
  const colors = { High: "bg-rose-500", Medium: "bg-amber-500", Low: "bg-emerald-500" };
  return <span className={`h-2 w-2 rounded-full inline-block ${colors[level]}`} />;
}

function CoordinatorHotspots({ farmers }) {
  const rows = useMemo(() => computeHotspots(farmers), [farmers]);
  if (!rows.length) return <EmptyState icon={AlertTriangle} title="No data yet" />;
  const top = rows[0];

  return (
    <div className="space-y-5">
      <SectionHeading eyebrow="Where To Act First" title="Agricultural Risk Hotspots" icon={AlertTriangle} />

      <Card className="p-5 border-rose-200 bg-rose-50/40">
        <div className="text-xs uppercase tracking-widest text-rose-600 font-mono mb-1">Highest Priority Village</div>
        <h3 className="font-serif text-2xl text-stone-900 mb-3">{top.village}</h3>
        <div className="grid sm:grid-cols-2 gap-2 text-sm">
          <div className="flex items-center gap-2"><PriorityDot level={top.soilTestingPriority} /> Soil Testing Awareness — {top.soilTestingPriority} Priority</div>
          <div className="flex items-center gap-2"><PriorityDot level={top.pesticideSafetyPriority} /> Pesticide Safety — {top.pesticideSafetyPriority} Priority</div>
          <div className="flex items-center gap-2"><PriorityDot level={top.fertilizerAwarenessPriority} /> Fertilizer Awareness — {top.fertilizerAwarenessPriority} Priority</div>
          <div className="flex items-center gap-2"><PriorityDot level={top.trainingPriority} /> Training Coverage — {top.trainingPriority} Priority</div>
        </div>
      </Card>

      <div className="grid md:grid-cols-2 gap-4">
        {rows.map((r) => (
          <Card key={r.village} className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-serif text-lg text-stone-900">{r.village}</h4>
              <span className="text-xs font-mono text-stone-500">{r.stats.total} farmers</span>
            </div>
            <div className="space-y-1.5 text-sm">
              <div className="flex items-center justify-between"><span className="flex items-center gap-1.5"><PriorityDot level={r.soilTestingPriority} /> Soil Testing</span><span className="text-stone-500">{r.stats.soilTestNoPct}% untested</span></div>
              <div className="flex items-center justify-between"><span className="flex items-center gap-1.5"><PriorityDot level={r.pesticideSafetyPriority} /> Pesticide Safety</span><span className="text-stone-500">{r.stats.noSafetyPct}% no gear</span></div>
              <div className="flex items-center justify-between"><span className="flex items-center gap-1.5"><PriorityDot level={r.fertilizerAwarenessPriority} /> Fertilizer Awareness</span><span className="text-stone-500">{r.stats.dealerDecisionPct}% dealer-led</span></div>
              <div className="flex items-center justify-between"><span className="flex items-center gap-1.5"><PriorityDot level={r.trainingPriority} /> Training Coverage</span><span className="text-stone-500">{r.stats.noTrainingPct}% untrained</span></div>
            </div>
          </Card>
        ))}
      </div>
      <DisclaimerNote>Hotspot tags are a screening/prioritization aid generated from survey percentages, not a scientific or regulatory assessment.</DisclaimerNote>
    </div>
  );
}

/* =========================================================================
   15. COORDINATOR: FARMERS LIST + DETAIL
   ========================================================================= */

function FarmersList({ farmers, onOpen }) {
  const [search, setSearch] = useState("");
  const [village, setVillage] = useState("");
  const [crop, setCrop] = useState("");
  const [risk, setRisk] = useState("");
  const [fertPractice, setFertPractice] = useState("");
  const [soilTest, setSoilTest] = useState("");
  const [pestRisk, setPestRisk] = useState("");
  const [training, setTraining] = useState("");

  const villages = useMemo(() => Array.from(new Set(farmers.map((f) => f.village))).sort(), [farmers]);
  const crops = useMemo(() => Array.from(new Set(farmers.flatMap((f) => (f.crops || "").split(",").map((c) => c.trim())).filter(Boolean))).sort(), [farmers]);

  const filtered = farmers.filter((f) => {
    if (search.trim()) {
      const q = search.toLowerCase();
      const hit = f.id.toLowerCase().includes(q) || (f.farmerName || "").toLowerCase().includes(q) || f.village.toLowerCase().includes(q) || (f.mobile || "").includes(q);
      if (!hit) return false;
    }
    if (village && f.village !== village) return false;
    if (crop && !(f.crops || "").toLowerCase().includes(crop.toLowerCase())) return false;
    if (risk && f.overallRisk !== risk) return false;
    if (soilTest && f.soilTest !== soilTest) return false;
    if (pestRisk && f.pesticideRisk.level !== pestRisk) return false;
    if (training && f.trainingStatus !== training) return false;
    if (fertPractice === "urea" && !(f.fertilizers || []).includes("Urea")) return false;
    if (fertPractice === "no-organic" && f.organicManureUse !== "Never") return false;
    if (fertPractice === "dealer" && !(f.fertilizerDecision === "Dealer" || f.fertilizerDecision === "Friends")) return false;
    return true;
  });

  const selectCls = "rounded-lg border border-stone-300 px-2.5 py-1.5 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500";

  return (
    <div className="space-y-4">
      <SectionHeading eyebrow={`${filtered.length} of ${farmers.length} records`} title="Farmers" icon={Users} />

      <Card className="p-4">
        <div className="relative mb-3">
          <Search className="h-4 w-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name, village, survey ID, mobile…"
            className="w-full rounded-lg border border-stone-300 pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
        </div>
        <div className="flex flex-wrap gap-2">
          <select className={selectCls} value={village} onChange={(e) => setVillage(e.target.value)}><option value="">All Villages</option>{villages.map((v) => <option key={v} value={v}>{v}</option>)}</select>
          <select className={selectCls} value={crop} onChange={(e) => setCrop(e.target.value)}><option value="">All Crops</option>{crops.map((c) => <option key={c} value={c}>{c}</option>)}</select>
          <select className={selectCls} value={risk} onChange={(e) => setRisk(e.target.value)}><option value="">Any Overall Risk</option><option>Low</option><option>Medium</option><option>High</option></select>
          <select className={selectCls} value={fertPractice} onChange={(e) => setFertPractice(e.target.value)}>
            <option value="">Any Fertilizer Practice</option><option value="urea">Uses Urea</option><option value="no-organic">Never Uses Organic Manure</option><option value="dealer">Dealer/Friend-based Decision</option>
          </select>
          <select className={selectCls} value={soilTest} onChange={(e) => setSoilTest(e.target.value)}><option value="">Any Soil Test Status</option><option value="Yes">Tested</option><option value="No">Not Tested</option></select>
          <select className={selectCls} value={pestRisk} onChange={(e) => setPestRisk(e.target.value)}><option value="">Any Pesticide Risk</option><option>Low</option><option>Medium</option><option>High</option></select>
          <select className={selectCls} value={training} onChange={(e) => setTraining(e.target.value)}><option value="">Any Training Status</option><option>Not Conducted</option><option>Scheduled</option><option>Completed</option></select>
        </div>
      </Card>

      <Card className="overflow-x-auto">
        <table className="w-full text-sm min-w-[720px]">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wide text-stone-500 border-b border-stone-200 bg-stone-50">
              <th className="py-2.5 px-4">Survey ID</th><th className="py-2.5 px-4">Farmer</th><th className="py-2.5 px-4">Village</th>
              <th className="py-2.5 px-4">Crop</th><th className="py-2.5 px-4">Overall</th><th className="py-2.5 px-4">Priority</th><th className="py-2.5 px-4">Training</th><th className="py-2.5 px-4">GPS</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((f) => (
              <tr key={f.id} onClick={() => onOpen(f.id)} className="border-b border-stone-100 hover:bg-emerald-50/40 cursor-pointer">
                <td className="py-2.5 px-4 font-mono text-xs">{f.id}</td>
                <td className="py-2.5 px-4">{f.farmerName || <span className="text-stone-400">Unnamed</span>}</td>
                <td className="py-2.5 px-4">{f.village}</td>
                <td className="py-2.5 px-4">{f.crops}</td>
                <td className="py-2.5 px-4"><RiskBadge level={f.overallRisk} size="sm" /></td>
                <td className="py-2.5 px-4"><span className={`text-xs font-medium ${f.priority.level === "High" ? "text-rose-600" : f.priority.level === "Medium" ? "text-amber-600" : "text-emerald-600"}`}>{f.priority.level} ({f.priority.score})</span></td>
                <td className="py-2.5 px-4 text-xs text-stone-500">{f.trainingStatus}</td>
                <td className="py-2.5 px-4">
                  {f.location && typeof f.location.latitude === "number" ? (
                    <MapPin className="h-3.5 w-3.5 text-emerald-600" />
                  ) : (
                    <MapPin className="h-3.5 w-3.5 text-stone-300" />
                  )}
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={8}><EmptyState icon={Search} title="No farmers match these filters" /></td></tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

function FarmerDetail({ farmer, allFarmers, onBack, onUpdate }) {
  const history = useMemo(() => allFarmers.filter((f) => f.farmerKey === farmer.farmerKey).sort((a, b) => new Date(a.date) - new Date(b.date)), [allFarmers, farmer]);
  const selectCls = "rounded-lg border border-stone-300 px-2.5 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500";

  const infoRows = [
    ["Age", farmer.age], ["Gender", farmer.gender], ["Education", farmer.education], ["Mobile", farmer.mobile || "—"],
    ["Land Size", farmer.landSize], ["Irrigation", farmer.irrigation], ["Experience", farmer.experience],
    ["Fertilizers Used", (farmer.fertilizers || []).join(", ")], ["Fertilizer Decision", farmer.fertilizerDecision],
    ["Organic Manure Use", farmer.organicManureUse], ["Pesticide Timing", farmer.pesticideTiming],
    ["Pesticide Dosage", farmer.pesticideDosage], ["Safety Equipment", farmer.safetyEquipment],
    ["Challenges", (farmer.challenges || []).join(", ")], ["Surveyed By", farmer.surveyedBy],
  ];

  return (
    <div className="space-y-5">
      <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-stone-600 hover:text-emerald-700"><ArrowLeft className="h-4 w-4" /> Back to Farmers</button>

      <Card className="p-5">
        <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
          <div>
            <div className="text-xs uppercase tracking-widest text-stone-500 font-mono mb-1">Survey {farmer.id}</div>
            <h3 className="font-serif text-2xl text-stone-900">{farmer.farmerName || "Unnamed Farmer"}</h3>
            <div className="text-sm text-stone-600 flex items-center gap-1 mt-1"><MapPin className="h-3.5 w-3.5" /> {farmer.village} · {farmer.crops}</div>
          </div>
          <RiskBadge level={farmer.overallRisk} />
        </div>
        <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-2 text-sm">
          {infoRows.map(([k, v]) => (
            <div key={k} className="flex justify-between border-b border-stone-100 py-1"><span className="text-stone-500">{k}</span><span className="text-stone-800 font-medium text-right">{v || "—"}</span></div>
          ))}
        </div>
        {farmer.suggestions && <p className="text-sm text-stone-600 mt-3 italic">"{farmer.suggestions}"</p>}
      </Card>

      <FarmerDashboard farmer={farmer} />

      <Card className="p-5">
        <h4 className="font-serif text-lg text-stone-900 mb-3">Intervention Progress Tracking</h4>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-stone-500 mb-1.5">Training Status</label>
            <select className={selectCls} value={farmer.trainingStatus} onChange={(e) => onUpdate(farmer.id, { trainingStatus: e.target.value })}>
              <option>Not Conducted</option><option>Scheduled</option><option>Completed</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-stone-500 mb-1.5">Follow-up Status</label>
            <select className={selectCls} value={farmer.followUpStatus} onChange={(e) => onUpdate(farmer.id, { followUpStatus: e.target.value })}>
              <option>Pending</option><option>Follow-up Required</option><option>Completed</option>
            </select>
          </div>
        </div>
      </Card>
    </div>
  );
}

/* =========================================================================
   16. COORDINATOR: REPORTS
   ========================================================================= */

function CoordinatorReports({ farmers }) {
  const total = farmers.length;
  const villages = Array.from(new Set(farmers.map((f) => f.village))).sort();
  const dates = farmers.map((f) => f.date).sort();
  const period = dates.length ? `${dates[0]} to ${dates[dates.length - 1]}` : "—";
  const riskDist = { Low: 0, Medium: 0, High: 0 };
  farmers.forEach((f) => { riskDist[f.overallRisk] = (riskDist[f.overallRisk] || 0) + 1; });
  const hotspots = computeHotspots(farmers).slice(0, 3);
  const challenges = distribution(farmers, (f) => f.challenges).slice(0, 5);
  const trainingCompleted = farmers.filter((f) => f.trainingStatus === "Completed").length;
  const followUpPending = farmers.filter((f) => f.followUpStatus !== "Completed").length;
  const wantTraining = farmers.filter((f) => f.wantTraining === "Yes").length;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between no-print">
        <SectionHeading eyebrow="Documentation" title="CSP Program Report" icon={FileText} />
        <button onClick={() => window.print()} className="flex items-center gap-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg px-4 py-2 text-sm font-medium">
          <Printer className="h-4 w-4" /> Export as PDF
        </button>
      </div>
      <p className="text-xs text-stone-400 -mt-3 no-print">Uses your browser's print dialog — choose "Save as PDF" as the destination.</p>

      <div id="report-printable">
        <Card className="p-6 print:shadow-none print:border-none">
          <div className="text-center mb-6 border-b border-stone-200 pb-4">
            <div className="text-xs uppercase tracking-widest text-emerald-700 font-mono mb-1">Community Service Project</div>
            <h2 className="font-serif text-2xl text-stone-900">Precision Agriculture &amp; Sustainable Fertilizer Utilization</h2>
            <p className="text-sm text-stone-500 mt-1">Survey period: {period} · Villages covered: {villages.join(", ") || "—"}</p>
          </div>

          <div className="grid sm:grid-cols-3 gap-3 mb-6">
            <StatCard label="Farmers Surveyed" value={total} icon={Users} />
            <StatCard label="Villages Covered" value={villages.length} icon={MapPin} />
            <StatCard label="High-Risk Farmers" value={riskDist.High} icon={AlertTriangle} tone="danger" />
          </div>

          <h3 className="font-serif text-lg text-stone-900 mb-2">Key Agricultural Problems Identified</h3>
          <ul className="list-disc list-inside text-sm text-stone-600 mb-5 space-y-1">
            {challenges.map((c) => <li key={c.name}>{c.name} — reported by {c.value} of {total} farmers ({pct(c.value, total)}%)</li>)}
          </ul>

          <h3 className="font-serif text-lg text-stone-900 mb-2">Fertilizer &amp; Pesticide Practice Analysis</h3>
          <p className="text-sm text-stone-600 mb-5">
            {pct(farmers.filter((f) => f.soilTest === "No").length, total)}% of surveyed farmers have never conducted a soil test, and
            {" "}{pct(farmers.filter((f) => (f.fertilizerDecision === "Dealer" || f.fertilizerDecision === "Friends")).length, total)}%
            {" "}base fertilizer decisions mainly on dealer or peer advice rather than expert guidance. On the pesticide side,
            {" "}{pct(farmers.filter((f) => f.pesticideDosage !== "Always").length, total)}% do not consistently follow the recommended
            dosage and {pct(farmers.filter((f) => f.safetyEquipment === "No").length, total)}% do not use protective safety equipment while spraying.
          </p>

          <h3 className="font-serif text-lg text-stone-900 mb-2">Risk Distribution</h3>
          <div className="flex gap-4 mb-5 text-sm">
            {["Low", "Medium", "High"].map((l) => <div key={l} className="flex items-center gap-1.5"><RiskBadge level={l} size="sm" /> {riskDist[l]} farmers</div>)}
          </div>

          <h3 className="font-serif text-lg text-stone-900 mb-2">Village Hotspots — Top Priority Areas</h3>
          <ol className="list-decimal list-inside text-sm text-stone-600 mb-5 space-y-1">
            {hotspots.map((h) => <li key={h.village}><strong>{h.village}</strong> — priority score {h.score}/8; {h.stats.soilTestNoPct}% untested soil, {h.stats.noSafetyPct}% no safety equipment.</li>)}
          </ol>

          <h3 className="font-serif text-lg text-stone-900 mb-2">Recommended Interventions</h3>
          <ul className="list-disc list-inside text-sm text-stone-600 mb-5 space-y-1">
            <li>Prioritize soil-testing awareness camps in {hotspots[0] ? hotspots[0].village : "the highest-priority village"}.</li>
            <li>Coordinate agricultural-officer consultation drives in villages with high dealer/peer-led fertilizer decisions.</li>
            <li>Run pesticide safety-equipment distribution/awareness sessions where usage is low.</li>
            <li>Schedule sustainable-farming training for the {pct(wantTraining, total)}% of farmers who expressed interest.</li>
          </ul>

          <h3 className="font-serif text-lg text-stone-900 mb-2">Training &amp; Follow-up Status</h3>
          <p className="text-sm text-stone-600 mb-2">
            Training completed for {trainingCompleted} of {total} farmers ({pct(trainingCompleted, total)}%). Follow-up still pending for {followUpPending} farmers.
          </p>

          <DisclaimerNote>
            This report is generated from self-reported survey data and application-level screening logic. It is intended
            to guide CSP outreach planning and does not constitute a laboratory soil analysis or certified agronomic audit.
          </DisclaimerNote>
        </Card>
      </div>
    </div>
  );
}

/* =========================================================================
   17. AWARENESS MODULE
   ========================================================================= */

const AWARENESS_TOPICS = [
  { title: "Balanced Fertilizer Use", icon: FlaskConical,
    body: "Fertilizer needs differ by crop, growth stage, and soil condition. Using the same fertilizer mix every season without checking soil condition can lead to nutrient imbalance, wasted spending, and long-term soil health decline. A soil test result, read together with an agricultural officer, is the most reliable starting point for deciding what and how much to apply." },
  { title: "Soil Testing", icon: Droplets,
    body: "A soil test measures the nutrients already present in your field before you decide what to add. It helps avoid both under-fertilizing (which limits yield) and over-fertilizing (which wastes money and can harm soil and water). Most agricultural extension offices offer soil testing at low or no cost — ask your local Agriculture Officer how to get a sample tested." },
  { title: "Safe Pesticide Practices", icon: SprayCan,
    body: "Follow the dosage printed on the product label or recommended by an agricultural officer — more is not better, and can damage crops, soil life, and health. Spray only when pests are actually present at damaging levels, rather than on a fixed calendar. Always wear protective equipment (mask, gloves, full-sleeve clothing) while mixing and spraying, and wash thoroughly afterward." },
  { title: "Sustainable Farming", icon: Leaf,
    body: "Healthy soil, careful water use, and natural pest control work together over time to reduce input costs and stabilize yield. Simple steps — composting crop residue, rotating crops, combining organic manure with chemical fertilizer, and monitoring pests before spraying (integrated pest management) — build resilience season after season." },
];

function AwarenessModule() {
  const [open, setOpen] = useState(0);
  return (
    <div className="space-y-5">
      <SectionHeading eyebrow="Learn" title="Sustainable Farming Awareness" icon={GraduationCap} />
      <div className="space-y-3">
        {AWARENESS_TOPICS.map((t, i) => {
          const Icon = t.icon;
          const expanded = open === i;
          return (
            <Card key={t.title} className="overflow-hidden">
              <button onClick={() => setOpen(expanded ? -1 : i)} className="w-full flex items-center justify-between gap-3 p-4 text-left">
                <span className="flex items-center gap-2.5 font-serif text-lg text-stone-900"><Icon className="h-5 w-5 text-emerald-700" /> {t.title}</span>
                <ChevronRight className={`h-4 w-4 text-stone-400 transition-transform ${expanded ? "rotate-90" : ""}`} />
              </button>
              {expanded && <div className="px-4 pb-4 text-sm text-stone-600 leading-relaxed border-t border-stone-100 pt-3">{t.body}</div>}
            </Card>
          );
        })}
      </div>
      <DisclaimerNote>General awareness content for farmer education. For crop-specific quantities or product choices, consult a qualified agricultural officer.</DisclaimerNote>
    </div>
  );
}

/* =========================================================================
   18. APP SHELL
   ========================================================================= */

export default function App() {
  const { farmers, loading, error, addFarmer, updateFarmer, resetDemo, clearAll } = useFarmersDB();
  const [role, setRole] = useState("surveyor"); // surveyor | farmer | coordinator
  const [coordTab, setCoordTab] = useState("overview");
  const [openFarmerId, setOpenFarmerId] = useState(null);

  const openFarmer = farmers.find((f) => f.id === openFarmerId);

  function switchRole(r) { setRole(r); setOpenFarmerId(null); setCoordTab("overview"); }

  return (
    <div className="min-h-screen bg-stone-50 font-sans text-stone-900">
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white; }
        }
      `}</style>

      <header className="bg-emerald-900 text-white no-print">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-lg bg-emerald-700 flex items-center justify-center flex-shrink-0"><Leaf className="h-5 w-5" /></div>
              <div>
                <div className="font-serif text-lg leading-tight">AgriBalance</div>
                <div className="text-[11px] text-emerald-200 tracking-wide">Precision Agriculture &amp; Sustainable Fertilizer CSP</div>
              </div>
            </div>
            <div className="flex gap-1.5 bg-emerald-800/60 rounded-full p-1">
              {[{ id: "surveyor", label: "Surveyor" }, { id: "farmer", label: "Farmer" }, { id: "coordinator", label: "Coordinator" }].map((r) => (
                <button key={r.id} onClick={() => switchRole(r.id)}
                  className={`px-3.5 py-1.5 rounded-full text-sm font-medium transition ${role === r.id ? "bg-white text-emerald-900" : "text-emerald-100 hover:bg-emerald-800"}`}>
                  {r.label}
                </button>
              ))}
            </div>
          </div>
          {role === "coordinator" && (
            <div className="flex gap-1 mt-3 overflow-x-auto -mx-1 px-1">
              {NAV_COORDINATOR.map((t) => {
                const Icon = t.icon;
                return (
                  <button key={t.id} onClick={() => { setCoordTab(t.id); setOpenFarmerId(null); }}
                    className={`flex items-center gap-1.5 flex-shrink-0 px-3 py-1.5 rounded-lg text-sm font-medium transition ${coordTab === t.id && !openFarmerId ? "bg-emerald-700 text-white" : "text-emerald-100 hover:bg-emerald-800/70"}`}>
                    <Icon className="h-3.5 w-3.5" /> {t.label}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6">
        {loading ? (
          <div className="py-24 text-center text-stone-400 text-sm">Loading survey records…</div>
        ) : (
          <>
            {error && <div className="mb-4 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 no-print">{error}</div>}

            {role === "surveyor" && <SurveyForm farmerCount={farmers.length} onSubmitted={addFarmer} farmers={farmers} />}
            {role === "farmer" && <FarmerSelfLookup farmers={farmers} />}
            {role === "coordinator" && (
              openFarmer ? (
                <FarmerDetail farmer={openFarmer} allFarmers={farmers} onBack={() => setOpenFarmerId(null)} onUpdate={updateFarmer} />
              ) : (
                <>
                  {coordTab === "overview" && <CoordinatorOverview farmers={farmers} onReset={resetDemo} onClear={clearAll} />}
                  {coordTab === "villages" && <CoordinatorVillages farmers={farmers} />}
                  {coordTab === "map" && <CoordinatorFieldMap farmers={farmers} />}
                  {coordTab === "hotspots" && <CoordinatorHotspots farmers={farmers} />}
                  {coordTab === "farmers" && <FarmersList farmers={farmers} onOpen={setOpenFarmerId} />}
                  {coordTab === "reports" && <CoordinatorReports farmers={farmers} />}
                  {coordTab === "awareness" && <AwarenessModule />}
                </>
              )
            )}
          </>
        )}
      </main>

      <footer className="max-w-6xl mx-auto px-4 pb-8 pt-2 text-xs text-stone-400 no-print">
        AgriBalance prototype · Records are stored in shared application storage, visible to everyone using this app instance.
      </footer>
    </div>
  );
}
