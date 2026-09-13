const config = {
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
};
const level = (score, thresholds) =>
  score >= thresholds.high
    ? "High"
    : score >= thresholds.medium
      ? "Medium"
      : "Low";

export function assessFarmer(f) {
  const fw = config.fertilizer.weights;
  let score = 0;
  const reasons = [];
  if (f.soilTest === "No") {
    score += fw.noSoilTest;
    reasons.push(
      "No soil test has ever been conducted, so fertilizer choices are not based on actual soil nutrient data.",
    );
  }
  if (["Dealer", "Friends"].includes(f.fertilizerDecision)) {
    score += fw.dealerOrFriendDecision;
    reasons.push(
      `Fertilizer selection is guided mainly by ${f.fertilizerDecision.toLowerCase()} rather than an agricultural officer or soil test.`,
    );
  }
  if (f.organicManureUse === "Never") {
    score += fw.neverOrganicManure;
    reasons.push(
      "Organic manure is never combined with chemical fertilizers, which can reduce soil organic matter over time.",
    );
  }
  if (
    (f.fertilizers || []).includes("Urea") &&
    !(f.fertilizers || []).some((x) =>
      ["Organic Manure", "Compost"].includes(x),
    )
  ) {
    score += fw.ureaWithoutOrganicSupplement;
    reasons.push(
      "Urea is used without any organic supplementation such as compost or manure.",
    );
  }
  if ((f.challenges || []).includes("High Fertilizer Cost")) {
    score += fw.highCostChallenge;
    reasons.push(
      "The farmer reports fertilizer cost as a major challenge, which is often linked to inefficient or excessive use.",
    );
  }
  if (f.trainingReceived === "No") {
    score += fw.noTraining;
    reasons.push(
      "No prior training on sustainable fertilizer use has been received.",
    );
  }
  if (!reasons.length)
    reasons.push(
      "Soil testing is in place, fertilizer decisions involve expert input, and organic matter is used alongside chemical fertilizers.",
    );
  const fertilizerRisk = {
    level: level(score, config.fertilizer.thresholds),
    score,
    reasons,
  };

  const pw = config.pesticide.weights;
  score = 0;
  const pestReasons = [];
  if (f.pesticideTiming === "Regularly") {
    score += pw.sprayRegularly;
    pestReasons.push(
      "Pesticides are sprayed on a regular schedule rather than in response to actual pest presence.",
    );
  }
  if (f.pesticideTiming === "Dealer's advice") {
    score += pw.sprayOnDealerAdvice;
    pestReasons.push(
      "Spraying decisions are based on dealer advice rather than a scouting-based assessment.",
    );
  }
  if (f.pesticideDosage === "Never") {
    score += pw.dosageNever;
    pestReasons.push("The recommended dosage is not followed.");
  } else if (f.pesticideDosage === "Sometimes") {
    score += pw.dosageSometimes;
    pestReasons.push("The recommended dosage is only followed sometimes.");
  }
  if (f.safetyEquipment === "No") {
    score += pw.noSafetyEquipment;
    pestReasons.push(
      "No protective safety equipment is used while spraying, which is a direct health risk.",
    );
  }
  if (!pestReasons.length)
    pestReasons.push(
      "Spraying is need-based, recommended dosage is followed, and safety equipment is used consistently.",
    );
  const pesticideRisk = {
    level: level(score, config.pesticide.thresholds),
    score,
    reasons: pestReasons,
  };

  const soilStatus =
    f.soilTest === "No"
      ? {
          status: "Soil Testing Recommended",
          tested: false,
          message:
            "Soil testing has not been done. A soil test helps determine actual nutrient requirements and supports more balanced, evidence-based fertilizer decisions.",
        }
      : {
          status: "Soil Testing Completed",
          tested: true,
          message:
            "A soil test has been conducted. Periodic re-testing (roughly every 2–3 years, or per local agricultural office guidance) helps keep fertilizer decisions aligned with current soil conditions.",
        };
  const rank = { Low: 1, Medium: 2, High: 3 };
  let overallNumber = Math.max(
    rank[fertilizerRisk.level],
    rank[pesticideRisk.level],
  );
  if (!soilStatus.tested && f.trainingReceived === "No")
    overallNumber = Math.min(3, overallNumber + 1);
  const overallRisk = ["Low", "Medium", "High"][overallNumber - 1];

  const pw2 = config.priority.weights;
  score = 0;
  const factors = [];
  if (fertilizerRisk.level === "High") {
    score += pw2.highFertilizerRisk;
    factors.push("High fertilizer-practice risk");
  }
  if (f.soilTest === "No") {
    score += pw2.noSoilTest;
    factors.push("No soil test conducted");
  }
  if (f.pesticideDosage !== "Always" || f.safetyEquipment === "No") {
    score += pw2.unsafePesticidePractice;
    factors.push("Unsafe pesticide practice (dosage or safety gear)");
  }
  if (f.safetyEquipment === "No") {
    score += pw2.noSafetyEquipment;
    factors.push("No protective equipment used");
  }
  if (f.trainingReceived === "No") {
    score += pw2.noTraining;
    factors.push("No sustainable farming training received");
  }
  const priority = {
    score,
    level: level(score, config.priority.thresholds),
    factors,
  };

  const recommendations = [];
  if (f.soilTest === "No")
    recommendations.push({
      category: "Soil Testing",
      text: "Schedule a soil test before making major fertilizer decisions. This will help identify actual nutrient needs.",
    });
  if (["Dealer", "Friends"].includes(f.fertilizerDecision))
    recommendations.push({
      category: "Fertilizer Selection",
      text: "Consider consulting an agricultural officer or a qualified agricultural expert alongside dealer or peer advice.",
    });
  if (f.organicManureUse === "Never")
    recommendations.push({
      category: "Organic Matter",
      text: "Explore integrating suitable organic sources (compost, farmyard manure) with recommended nutrient management practices.",
    });
  if (["Sometimes", "Never"].includes(f.pesticideDosage))
    recommendations.push({
      category: "Pesticide Dosage",
      text: "Follow the product label and locally recommended dosage. Avoid increasing dosage without expert guidance.",
    });
  if (f.safetyEquipment === "No")
    recommendations.push({
      category: "Safety",
      text: "Use appropriate protective equipment (mask, gloves, full-sleeve clothing) while handling and spraying pesticides.",
    });
  if (f.trainingReceived === "No")
    recommendations.push({
      category: "Training",
      text: "Participate in an upcoming sustainable farming awareness/training session in your village.",
    });
  if (f.pesticideTiming === "Regularly")
    recommendations.push({
      category: "Pest Monitoring",
      text: "Move toward need-based spraying guided by regular field scouting rather than a fixed calendar schedule.",
    });
  if (fertilizerRisk.level === "High" || pesticideRisk.level === "High")
    recommendations.push({
      category: "Expert Consultation",
      text: "Given the current risk level, a visit from an agricultural officer is recommended before the next cropping cycle.",
    });
  if (!recommendations.length)
    recommendations.push({
      category: "Keep it up",
      text: "Current practices reflect several sustainable habits. Continue periodic soil testing and expert consultation to maintain this.",
    });
  return {
    fertilizerRisk,
    pesticideRisk,
    soilStatus,
    overallRisk,
    priority,
    recommendations,
  };
}
