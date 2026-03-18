// Pure TypeScript business logic — NO Convex imports.
// Can be imported by both server functions and client components.

// ── Types ──────────────────────────────────────────────────────────────────────

export type SkillRating = {
  id: string;
  name: string;
  weight: number;
  rating: number | null;
};

export type ValueRating = {
  id: string;
  name: string;
  category: string;
  rating: number | null;
};

export type Flag = { text: string; type: "danger" | "warn" | "success" };

export type PromoCriterion = { text: string; met: boolean | null };

export type ExecMetric = { label: string; value: string; className: string };

export type DashCard = {
  id: string;
  label: string;
  value: string;
  detail?: string;
  className: string;
};

// ── Helpers ────────────────────────────────────────────────────────────────────

function getSkill(
  skills: SkillRating[],
  id: string
): SkillRating | undefined {
  return skills.find((s) => s.id === id);
}

function getValue(
  values: ValueRating[],
  id: string
): ValueRating | undefined {
  return values.find((v) => v.id === id);
}

function skillRating(skills: SkillRating[], id: string): number | null {
  return getSkill(skills, id)?.rating ?? null;
}

function valueRating(values: ValueRating[], id: string): number | null {
  return getValue(values, id)?.rating ?? null;
}

function metricNum(
  metrics: Record<string, number | string | null>,
  id: string
): number {
  const v = metrics[id];
  if (v === null || v === undefined) return 0;
  if (typeof v === "number") return v;
  const n = Number(v);
  return isNaN(n) ? 0 : n;
}

// ── Score Computations ─────────────────────────────────────────────────────────

export function computeWeightedSkillScore(
  skillRatings: SkillRating[]
): { score: number | null; display: string } {
  if (skillRatings.length === 0) return { score: null, display: "\u2014" };

  const rated = skillRatings.filter((s) => s.rating !== null);

  if (rated.length === 0) return { score: null, display: "\u2014" };

  if (rated.length < skillRatings.length) {
    return {
      score: null,
      display: `${rated.length}/${skillRatings.length} rated`,
    };
  }

  const score = rated.reduce((sum, s) => sum + s.rating! * s.weight, 0);
  return { score, display: score.toFixed(2) };
}

export function computeAverageValueScore(
  valueRatings: ValueRating[]
): { score: number | null; display: string } {
  if (valueRatings.length === 0) return { score: null, display: "\u2014" };

  const rated = valueRatings.filter((v) => v.rating !== null);

  if (rated.length === 0) return { score: null, display: "\u2014" };

  if (rated.length < valueRatings.length) {
    return {
      score: null,
      display: `${rated.length}/${valueRatings.length} rated`,
    };
  }

  const score = rated.reduce((sum, v) => sum + v.rating!, 0) / rated.length;
  return { score, display: score.toFixed(2) };
}

export function computeCompositeScore(
  skillScore: number | null,
  valueScore: number | null
): { score: number | null; display: string } {
  if (skillScore === null || valueScore === null) {
    return { score: null, display: "\u2014" };
  }
  const score = skillScore * 0.7 + valueScore * 0.3;
  return { score, display: score.toFixed(2) };
}

// ── Flag Computations ──────────────────────────────────────────────────────────

export function computeSkillFlags(
  skillRatings: SkillRating[],
  roleType: string
): Flag[] {
  const flags: Flag[] = [];
  const rated = skillRatings.filter((s) => s.rating !== null);
  const allRated = rated.length === skillRatings.length && skillRatings.length > 0;
  const anyBelow3 = rated.some((s) => s.rating! < 3);
  const noneBelow3 = !anyBelow3 && allRated;
  const countGe4 = rated.filter((s) => s.rating! >= 4).length;

  if (roleType === "ca") {
    const code = skillRating(skillRatings, "code");

    if (anyBelow3) {
      flags.push({ text: "Below Role Stability", type: "danger" });
    }
    if (code !== null && code < 3) {
      flags.push({
        text: "Technical Risk \u2013 Immediate Correction",
        type: "danger",
      });
    }
    if (countGe4 >= 3 && noneBelow3 && allRated) {
      flags.push({ text: "Stable", type: "success" });
    }
    if (countGe4 >= 4 && code !== null && code >= 4 && noneBelow3) {
      flags.push({ text: "Senior Track Eligible", type: "success" });
    }
  } else if (roleType === "id") {
    const doc = skillRating(skillRatings, "doc");
    const meeting = skillRating(skillRatings, "meeting");
    const drawing = skillRating(skillRatings, "drawing");

    if (anyBelow3) {
      flags.push({ text: "Below Role Stability", type: "danger" });
    }
    if (doc !== null && doc < 3) {
      flags.push({ text: "Documentation Risk", type: "danger" });
    }
    if (meeting !== null && meeting < 3) {
      flags.push({ text: "Client Exposure Risk", type: "danger" });
    }
    if (drawing !== null && drawing < 3) {
      flags.push({ text: "Version Control Risk", type: "danger" });
    }
    if (countGe4 >= 4 && noneBelow3 && allRated) {
      flags.push({ text: "Senior Track Eligible", type: "success" });
    }
  }

  return flags;
}

export function computeValueFlags(
  valueRatings: ValueRating[],
  roleType: string
): Flag[] {
  const flags: Flag[] = [];
  const rated = valueRatings.filter((v) => v.rating !== null);
  const anyBelow3 = rated.some((v) => v.rating! < 3);
  const integrity = valueRating(valueRatings, "integrity");
  const communication = valueRating(valueRatings, "communication");

  if (anyBelow3) {
    flags.push({ text: "Cultural Risk Flag", type: "warn" });
  }
  if (integrity !== null && integrity < 3) {
    flags.push({ text: "Automatic Escalation Review", type: "danger" });
  }
  if (roleType === "id" && communication !== null && communication < 3) {
    flags.push({ text: "Client Risk Flag", type: "danger" });
  }

  return flags;
}

export function computeAuthorityFlags(
  skillRatings: SkillRating[],
  roleType: string
): Flag[] {
  const flags: Flag[] = [];

  if (roleType === "ca") {
    const code = skillRating(skillRatings, "code");
    const submit = skillRating(skillRatings, "submit");
    const ca = skillRating(skillRatings, "ca");

    if (code !== null && code < 3) {
      flags.push({
        text: "Cannot independently respond to code RFIs",
        type: "danger",
      });
    }
    if (submit !== null && submit < 4) {
      flags.push({
        text: "Requires PM approval before issuing submittals",
        type: "warn",
      });
    }
    if (ca !== null && ca < 4) {
      flags.push({ text: "Cannot lead site walks solo", type: "warn" });
    }
  } else if (roleType === "id") {
    const meeting = skillRating(skillRatings, "meeting");
    const doc = skillRating(skillRatings, "doc");
    const qc = skillRating(skillRatings, "qc");

    if (meeting !== null && meeting < 3) {
      flags.push({ text: "Cannot lead client meetings", type: "danger" });
    }
    if (doc !== null && doc < 3) {
      flags.push({
        text: "Drawings require peer review before issue",
        type: "warn",
      });
    }
    if (qc !== null && qc < 3) {
      flags.push({ text: "Mandatory senior review gate", type: "warn" });
    }
  }

  return flags;
}

// ── Deficiency Triggers ────────────────────────────────────────────────────────

export function computeDeficiencyTriggers(
  skillRatings: SkillRating[],
  valueRatings: ValueRating[],
  roleType: string
): { triggered: boolean; gaps: string[] } {
  const gaps: string[] = [];
  const rated = skillRatings.filter((s) => s.rating !== null);
  const integrity = valueRating(valueRatings, "integrity");

  const anySkillLe2 = rated.some((s) => s.rating! <= 2);

  if (roleType === "ca") {
    const code = skillRating(skillRatings, "code");

    const triggered =
      anySkillLe2 ||
      (code !== null && code < 3) ||
      (integrity !== null && integrity < 3);

    // Skills with rating <= 2
    for (const s of rated) {
      if (s.rating! <= 2) {
        gaps.push(`${s.name} (Score: ${s.rating})`);
      }
    }
    // Code if < 3 but > 2 (not already captured)
    if (code !== null && code < 3 && code > 2) {
      const skill = getSkill(skillRatings, "code");
      if (skill) gaps.push(`${skill.name} (Score: ${code})`);
    }
    // Integrity if < 3
    if (integrity !== null && integrity < 3) {
      const val = getValue(valueRatings, "integrity");
      if (val) gaps.push(`${val.name} (Score: ${integrity})`);
    }

    return { triggered, gaps };
  } else if (roleType === "id") {
    const doc = skillRating(skillRatings, "doc");
    const meeting = skillRating(skillRatings, "meeting");

    const triggered =
      anySkillLe2 ||
      (doc !== null && doc < 3) ||
      (meeting !== null && meeting < 3) ||
      (integrity !== null && integrity < 3);

    // Skills with rating <= 2
    for (const s of rated) {
      if (s.rating! <= 2) {
        gaps.push(`${s.name} (Score: ${s.rating})`);
      }
    }
    // Doc if < 3 but > 2
    if (doc !== null && doc < 3 && doc > 2) {
      const skill = getSkill(skillRatings, "doc");
      if (skill) gaps.push(`${skill.name} (Score: ${doc})`);
    }
    // Meeting if < 3 but > 2
    if (meeting !== null && meeting < 3 && meeting > 2) {
      const skill = getSkill(skillRatings, "meeting");
      if (skill) gaps.push(`${skill.name} (Score: ${meeting})`);
    }
    // Integrity if < 3
    if (integrity !== null && integrity < 3) {
      const val = getValue(valueRatings, "integrity");
      if (val) gaps.push(`${val.name} (Score: ${integrity})`);
    }

    return { triggered, gaps };
  }

  return { triggered: false, gaps: [] };
}

// ── Inflation Warning ──────────────────────────────────────────────────────────

export function computeInflationWarning(
  skillRatings: SkillRating[],
  metrics: Record<string, number | string | null>,
  roleType: string
): boolean {
  if (roleType === "ca") {
    const codeEsc = metricNum(metrics, "metricCodeEsc");
    const code = skillRating(skillRatings, "code");
    return codeEsc > 2 && code !== null && code >= 4;
  } else if (roleType === "id") {
    const revisions = metricNum(metrics, "metricRevisions");
    const doc = skillRating(skillRatings, "doc");
    return revisions > 2 && doc !== null && doc >= 4;
  }
  return false;
}

// ── Promotion Criteria ─────────────────────────────────────────────────────────

export function computePromotionCriteria(
  skillRatings: SkillRating[],
  valueRatings: ValueRating[],
  metrics: Record<string, number | string | null>,
  roleType: string
): {
  tiers: { name: string; criteria: PromoCriterion[]; passed: boolean | null }[];
  statusText: string;
  statusColor: string;
} {
  const rated = skillRatings.filter((s) => s.rating !== null);
  const allRated = rated.length === skillRatings.length && skillRatings.length > 0;
  const noneBelow3 = allRated && !rated.some((s) => s.rating! < 3);
  const noneBelow2 = allRated && !rated.some((s) => s.rating! < 2);
  const countGe4 = rated.filter((s) => s.rating! >= 4).length;
  const countGe3 = rated.filter((s) => s.rating! >= 3).length;
  const pctGe4 = allRated ? countGe4 / skillRatings.length : 0;
  const pctGe3 = allRated ? countGe3 / skillRatings.length : 0;

  if (roleType === "ca") {
    const code = skillRating(skillRatings, "code");
    const judgment = valueRating(valueRatings, "judgment");
    const integrity = valueRating(valueRatings, "integrity");
    const codeEsc = metricNum(metrics, "metricCodeEsc");

    const c1: PromoCriterion = {
      text: "\u2265 80% skills at Level 4",
      met: allRated ? pctGe4 >= 0.8 : null,
    };
    const c2: PromoCriterion = {
      text: "Code & Regulatory Research \u2265 4",
      met: code !== null ? code >= 4 : null,
    };
    const c3: PromoCriterion = {
      text: "No skill below 3",
      met: allRated ? noneBelow3 : null,
    };
    const c4: PromoCriterion = {
      text: "Judgment \u2265 4",
      met: judgment !== null ? judgment >= 4 : null,
    };
    const c5: PromoCriterion = {
      text: "Integrity \u2265 4",
      met: integrity !== null ? integrity >= 4 : null,
    };
    const c6: PromoCriterion = {
      text: "Demonstrated reduction in technical escalations",
      met: codeEsc <= 1,
    };

    const criteria = [c1, c2, c3, c4, c5, c6];
    const allMet = criteria.every((c) => c.met === true);
    const anyNull = criteria.some((c) => c.met === null);

    const tier = {
      name: "Senior CA",
      criteria,
      passed: anyNull ? null : allMet,
    };

    const statusText = allMet
      ? "\u2713 Senior CA Eligible"
      : "\u2717 Not Yet Eligible";
    const statusColor = allMet ? "success" : "danger";

    return { tiers: [tier], statusText, statusColor };
  } else if (roleType === "id") {
    // Junior tier (Designer III)
    const meeting = skillRating(skillRatings, "meeting");
    const drawing = skillRating(skillRatings, "drawing");
    const qc = skillRating(skillRatings, "qc");
    const doc = skillRating(skillRatings, "doc");
    const clientSkill = skillRating(skillRatings, "client");
    const communication = valueRating(valueRatings, "communication");

    const j1: PromoCriterion = {
      text: "\u2265 80% skills at Level 3",
      met: allRated ? pctGe3 >= 0.8 : null,
    };
    const j2: PromoCriterion = {
      text: "No skill below Level 2",
      met: allRated ? noneBelow2 : null,
    };
    const j3: PromoCriterion = {
      text: "Meeting Preparation \u2265 3",
      met: meeting !== null ? meeting >= 3 : null,
    };
    const j4: PromoCriterion = {
      text: "Drawing Discipline \u2265 3",
      met: drawing !== null ? drawing >= 3 : null,
    };
    const j5: PromoCriterion = {
      text: "No recurring QC failures",
      met: qc !== null ? qc >= 3 : null,
    };

    const juniorCriteria = [j1, j2, j3, j4, j5];
    const juniorAllMet = juniorCriteria.every((c) => c.met === true);
    const juniorAnyNull = juniorCriteria.some((c) => c.met === null);

    const juniorTier = {
      name: "Designer III",
      criteria: juniorCriteria,
      passed: juniorAnyNull ? null : juniorAllMet,
    };

    // Senior tier
    const s1: PromoCriterion = {
      text: "\u2265 80% skills at Level 4",
      met: allRated ? pctGe4 >= 0.8 : null,
    };
    const s2: PromoCriterion = {
      text: "Documentation Coordination \u2265 4",
      met: doc !== null ? doc >= 4 : null,
    };
    const s3: PromoCriterion = {
      text: "Meeting Preparation \u2265 4",
      met: meeting !== null ? meeting >= 4 : null,
    };
    const s4: PromoCriterion = {
      text: "Client Interaction \u2265 4",
      met: clientSkill !== null ? clientSkill >= 4 : null,
    };
    const s5: PromoCriterion = {
      text: "Communication value \u2265 4",
      met: communication !== null ? communication >= 4 : null,
    };
    const s6: PromoCriterion = {
      text: "No skill below 3",
      met: allRated ? noneBelow3 : null,
    };

    const seniorCriteria = [s1, s2, s3, s4, s5, s6];
    const seniorAllMet = seniorCriteria.every((c) => c.met === true);
    const seniorAnyNull = seniorCriteria.some((c) => c.met === null);

    const seniorTier = {
      name: "Senior Designer",
      criteria: seniorCriteria,
      passed: seniorAnyNull ? null : seniorAllMet,
    };

    let statusText: string;
    let statusColor: string;

    if (seniorAllMet) {
      statusText = "\u2713 Senior Designer Eligible";
      statusColor = "success";
    } else if (juniorAllMet) {
      statusText = "\u2713 Designer III Eligible";
      statusColor = "teal";
    } else {
      statusText = "\u2717 Not Yet Eligible";
      statusColor = "danger";
    }

    return { tiers: [juniorTier, seniorTier], statusText, statusColor };
  }

  return { tiers: [], statusText: "\u2014", statusColor: "" };
}

// ── Executive Summary ──────────────────────────────────────────────────────────

export function computeExecutiveSummary(
  skillRatings: SkillRating[],
  valueRatings: ValueRating[],
  metrics: Record<string, number | string | null>,
  roleType: string
): ExecMetric[] {
  const rated = skillRatings.filter((s) => s.rating !== null);
  const allRated = rated.length === skillRatings.length && skillRatings.length > 0;
  const anyBelow2 = rated.some((s) => s.rating! < 2);
  const anyBelow3 = rated.some((s) => s.rating! < 3);
  const noneBelow3 = allRated && !anyBelow3;
  const countGe4 = rated.filter((s) => s.rating! >= 4).length;

  if (roleType === "ca") {
    const code = skillRating(skillRatings, "code");
    const codeEsc = metricNum(metrics, "metricCodeEsc");
    const disputes = metricNum(metrics, "metricDisputes");

    // Delivery Risk
    let deliveryRisk: string;
    let deliveryClass: string;
    if (anyBelow2 || codeEsc > 3 || disputes > 2) {
      deliveryRisk = "High";
      deliveryClass = "exec-danger";
    } else if (anyBelow3 || codeEsc > 1) {
      deliveryRisk = "Moderate";
      deliveryClass = "exec-warn";
    } else {
      deliveryRisk = "Low";
      deliveryClass = "exec-success";
    }

    // Technical Authority
    let techAuth: string;
    let techClass: string;
    if (countGe4 >= 4 && code !== null && code >= 4 && noneBelow3) {
      techAuth = "Senior";
      techClass = "exec-success";
    } else if (noneBelow3) {
      techAuth = "Stable";
      techClass = "exec-stable";
    } else {
      techAuth = "Developing";
      techClass = "exec-warn";
    }

    // Succession
    let succession: string;
    let successionClass: string;
    if (!allRated) {
      succession = "Pending";
      successionClass = "exec-neutral";
    } else if (countGe4 >= 4 && noneBelow3 && code !== null && code >= 4) {
      succession = "Yes";
      successionClass = "exec-success";
    } else if (anyBelow2) {
      succession = "No";
      successionClass = "exec-danger";
    } else {
      succession = "Not Yet";
      successionClass = "exec-warn";
    }

    return [
      { label: "Delivery Risk", value: deliveryRisk, className: deliveryClass },
      {
        label: "Technical Authority",
        value: techAuth,
        className: techClass,
      },
      { label: "Succession", value: succession, className: successionClass },
    ];
  } else if (roleType === "id") {
    const meeting = skillRating(skillRatings, "meeting");
    const doc = skillRating(skillRatings, "doc");
    const drawing = skillRating(skillRatings, "drawing");
    const communication = valueRating(valueRatings, "communication");
    const revisions = metricNum(metrics, "metricRevisions");

    // Delivery Risk
    let deliveryRisk: string;
    let deliveryClass: string;
    if (anyBelow2 || revisions > 4) {
      deliveryRisk = "High";
      deliveryClass = "exec-danger";
    } else if (anyBelow3 || revisions > 2) {
      deliveryRisk = "Moderate";
      deliveryClass = "exec-warn";
    } else {
      deliveryRisk = "Low";
      deliveryClass = "exec-success";
    }

    // Client Exposure
    let clientExposure: string;
    let clientClass: string;
    if (
      (meeting !== null && meeting < 3) ||
      (communication !== null && communication < 3)
    ) {
      clientExposure = "At Risk";
      clientClass = "exec-danger";
    } else {
      clientExposure = "Stable";
      clientClass = "exec-success";
    }

    // Documentation
    let documentation: string;
    let docClass: string;
    if (
      (doc !== null && doc < 3) ||
      (drawing !== null && drawing < 3)
    ) {
      documentation = "Needs Oversight";
      docClass = "exec-warn";
    } else {
      documentation = "Stable";
      docClass = "exec-success";
    }

    // Succession
    let succession: string;
    let successionClass: string;
    if (!allRated) {
      succession = "Pending";
      successionClass = "exec-neutral";
    } else if (countGe4 >= 4 && noneBelow3) {
      succession = "Yes";
      successionClass = "exec-success";
    } else if (anyBelow2) {
      succession = "No";
      successionClass = "exec-danger";
    } else {
      succession = "Not Yet";
      successionClass = "exec-warn";
    }

    return [
      { label: "Delivery Risk", value: deliveryRisk, className: deliveryClass },
      {
        label: "Client Exposure",
        value: clientExposure,
        className: clientClass,
      },
      { label: "Documentation", value: documentation, className: docClass },
      { label: "Succession", value: succession, className: successionClass },
    ];
  }

  return [];
}

// ── Dashboard ──────────────────────────────────────────────────────────────────

export function computeDashboard(
  skillRatings: SkillRating[],
  valueRatings: ValueRating[],
  metrics: Record<string, number | string | null>,
  authorityLevel: string | undefined,
  roleType: string
): DashCard[] {
  const rated = skillRatings.filter((s) => s.rating !== null);
  const allRated = rated.length === skillRatings.length && skillRatings.length > 0;
  const noneBelow3 = allRated && !rated.some((s) => s.rating! < 3);
  const countGe4 = rated.filter((s) => s.rating! >= 4).length;

  const { score: skillScore } = computeWeightedSkillScore(skillRatings);
  const { score: valueScore } = computeAverageValueScore(valueRatings);
  const { display: compositeDisplay } = computeCompositeScore(
    skillScore,
    valueScore
  );

  // Average score across rated skills
  const avgScore =
    rated.length > 0
      ? (rated.reduce((s, r) => s + r.rating!, 0) / rated.length).toFixed(2)
      : "\u2014";

  // Lowest score
  const lowestSkill =
    rated.length > 0
      ? rated.reduce((min, s) => (s.rating! < min.rating! ? s : min), rated[0])
      : null;

  const authDisplay = authorityLevel || "Not Set";

  if (roleType === "ca") {
    const code = skillRating(skillRatings, "code");
    const judgment = valueRating(valueRatings, "judgment");
    const codeEsc = metricNum(metrics, "metricCodeEsc");

    const seniorEligible =
      countGe4 >= 4 && code !== null && code >= 4 && noneBelow3;

    return [
      {
        id: "avg-score",
        label: "Avg Skill Score",
        value: avgScore,
        className:
          "dash-card" +
          (rated.length > 0 && Number(avgScore) >= 4
            ? " highlight"
            : rated.length > 0 && Number(avgScore) < 3
              ? " danger-card"
              : ""),
      },
      {
        id: "lowest-score",
        label: "Lowest Skill",
        value: lowestSkill ? String(lowestSkill.rating) : "\u2014",
        detail: lowestSkill ? lowestSkill.name : undefined,
        className:
          "dash-card" +
          (lowestSkill && lowestSkill.rating! < 3 ? " danger-card" : ""),
      },
      {
        id: "code-skill",
        label: "Code & Regulatory",
        value: code !== null ? String(code) : "\u2014",
        className:
          "dash-card" +
          (code !== null && code >= 4
            ? " highlight"
            : code !== null && code < 3
              ? " danger-card"
              : ""),
      },
      {
        id: "judgment-value",
        label: "Judgment",
        value: judgment !== null ? String(judgment) : "\u2014",
        className:
          "dash-card" +
          (judgment !== null && judgment >= 4
            ? " highlight"
            : judgment !== null && judgment < 3
              ? " warn-card"
              : ""),
      },
      {
        id: "code-escalations",
        label: "Code Escalations",
        value: String(codeEsc),
        className:
          "dash-card" +
          (codeEsc > 2 ? " danger-card" : codeEsc === 0 ? " highlight" : ""),
      },
      {
        id: "senior-track",
        label: "Senior Track",
        value: seniorEligible ? "Eligible" : allRated ? "Not Yet" : "Pending",
        className:
          "dash-card" +
          (seniorEligible
            ? " highlight"
            : allRated
              ? " warn-card"
              : ""),
      },
      {
        id: "authority-level",
        label: "Authority Level",
        value: authDisplay,
        className: "dash-card",
      },
      {
        id: "composite",
        label: "Composite Score",
        value: compositeDisplay,
        className:
          "dash-card" +
          (skillScore !== null && valueScore !== null
            ? Number(compositeDisplay) >= 4
              ? " highlight"
              : Number(compositeDisplay) < 3
                ? " danger-card"
                : ""
            : ""),
      },
    ];
  } else if (roleType === "id") {
    const doc = skillRating(skillRatings, "doc");
    const meeting = skillRating(skillRatings, "meeting");
    const communication = valueRating(valueRatings, "communication");
    const revisions = metricNum(metrics, "metricRevisions");

    const seniorEligible = countGe4 >= 4 && noneBelow3;

    return [
      {
        id: "avg-score",
        label: "Avg Skill Score",
        value: avgScore,
        className:
          "dash-card" +
          (rated.length > 0 && Number(avgScore) >= 4
            ? " highlight"
            : rated.length > 0 && Number(avgScore) < 3
              ? " danger-card"
              : ""),
      },
      {
        id: "lowest-score",
        label: "Lowest Skill",
        value: lowestSkill ? String(lowestSkill.rating) : "\u2014",
        detail: lowestSkill ? lowestSkill.name : undefined,
        className:
          "dash-card" +
          (lowestSkill && lowestSkill.rating! < 3 ? " danger-card" : ""),
      },
      {
        id: "doc-skill",
        label: "Documentation",
        value: doc !== null ? String(doc) : "\u2014",
        className:
          "dash-card" +
          (doc !== null && doc >= 4
            ? " highlight"
            : doc !== null && doc < 3
              ? " danger-card"
              : ""),
      },
      {
        id: "meeting-skill",
        label: "Meeting Prep",
        value: meeting !== null ? String(meeting) : "\u2014",
        className:
          "dash-card" +
          (meeting !== null && meeting >= 4
            ? " highlight"
            : meeting !== null && meeting < 3
              ? " danger-card"
              : ""),
      },
      {
        id: "communication-value",
        label: "Communication",
        value: communication !== null ? String(communication) : "\u2014",
        className:
          "dash-card" +
          (communication !== null && communication >= 4
            ? " highlight"
            : communication !== null && communication < 3
              ? " warn-card"
              : ""),
      },
      {
        id: "rework-count",
        label: "Rework / Revisions",
        value: String(revisions),
        className:
          "dash-card" +
          (revisions > 4
            ? " danger-card"
            : revisions > 2
              ? " warn-card"
              : revisions === 0
                ? " highlight"
                : ""),
      },
      {
        id: "senior-track",
        label: "Senior Track",
        value: seniorEligible ? "Eligible" : allRated ? "Not Yet" : "Pending",
        className:
          "dash-card" +
          (seniorEligible
            ? " highlight"
            : allRated
              ? " warn-card"
              : ""),
      },
      {
        id: "authority-level",
        label: "Authority Level",
        value: authDisplay,
        className: "dash-card",
      },
    ];
  }

  return [];
}
