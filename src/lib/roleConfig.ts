import type {
  RoleConfig,
  EvaluationContext,
} from "./types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function ratedSkills(ctx: EvaluationContext): number[] {
  return ctx.skills
    .map((s) => ctx.skillRatings[s.id])
    .filter((r): r is number => r != null);
}

function allSkillsRated(ctx: EvaluationContext): boolean {
  return ratedSkills(ctx).length === ctx.skills.length;
}

function pctSkillsAtOrAbove(ctx: EvaluationContext, level: number): number | null {
  const rated = ratedSkills(ctx);
  if (rated.length === 0) return null;
  return rated.filter((r) => r >= level).length / ctx.skills.length;
}

function noSkillBelow(ctx: EvaluationContext, level: number): boolean | null {
  if (!allSkillsRated(ctx)) return null;
  return ratedSkills(ctx).every((r) => r >= level);
}

function skillAtLeast(ctx: EvaluationContext, skillId: string, level: number): boolean | null {
  const r = ctx.skillRatings[skillId];
  if (r == null) return null;
  return r >= level;
}

function valueAtLeast(ctx: EvaluationContext, valueId: string, level: number): boolean | null {
  const r = ctx.valueRatings[valueId];
  if (r == null) return null;
  return r >= level;
}

// ---------------------------------------------------------------------------
// CA_CONFIG — Construction Administrator
// ---------------------------------------------------------------------------

export const CA_CONFIG: RoleConfig = {
  roleType: "ca",
  title: "Construction Administrator",
  subtitle: "Performance Evaluation",

  skills: [
    { id: "ca", name: "Construction Administration", weight: 0.20 },
    { id: "rfi", name: "RFI Management", weight: 0.15 },
    { id: "submit", name: "Submittal Review", weight: 0.15 },
    { id: "punch", name: "Punch List Management", weight: 0.15 },
    { id: "closeout", name: "Project Close-Out", weight: 0.15 },
    { id: "code", name: "Code & Regulatory Research", weight: 0.20 },
  ],

  values: [
    { id: "judgment", name: "Judgment", category: "High Weight" },
    { id: "integrity", name: "Integrity", category: "High Weight" },
    { id: "communication", name: "Communication", category: "High Weight" },
    { id: "impact", name: "Impact", category: "Moderate" },
    { id: "curiosity", name: "Curiosity", category: "Moderate" },
    { id: "innovation", name: "Innovation Courage", category: "Standard" },
    { id: "passion", name: "Passion", category: "Standard" },
    { id: "selflessness", name: "Selflessness", category: "Standard" },
  ],

  metrics: [
    {
      id: "metricRFI",
      name: "metricRFI",
      label: "# of RFIs requiring PM rewrite",
      type: "number",
      min: 0,
      placeholder: "0",
    },
    {
      id: "metricSubmittals",
      name: "metricSubmittals",
      label: "# of submittals returned for insufficient review",
      type: "number",
      min: 0,
      placeholder: "0",
    },
    {
      id: "metricSiteVisits",
      name: "metricSiteVisits",
      label: "% of site visits completed without documentation gaps",
      type: "percentage",
      min: 0,
      max: 100,
      placeholder: "%",
    },
    {
      id: "metricCodeEsc",
      name: "metricCodeEsc",
      label: "Code-related escalations per quarter",
      type: "number",
      min: 0,
      placeholder: "0",
    },
    {
      id: "metricDisputes",
      name: "metricDisputes",
      label: "Contractor disputes requiring executive involvement",
      type: "number",
      min: 0,
      placeholder: "0",
    },
  ],

  authorityLevels: [
    { value: "limited", label: "Limited CA Authority" },
    { value: "standard", label: "Standard CA Authority" },
    { value: "senior", label: "Senior CA Authority" },
  ],

  promotionTiers: [
    {
      name: "Senior CA Eligible",
      criteria: [
        {
          text: "\u2265 80% skills at Level 4",
          evaluate: (ctx: EvaluationContext) => {
            const pct = pctSkillsAtOrAbove(ctx, 4);
            return pct == null ? null : pct >= 0.8;
          },
        },
        {
          text: "Code & Regulatory Research \u2265 4",
          evaluate: (ctx: EvaluationContext) => skillAtLeast(ctx, "code", 4),
        },
        {
          text: "No skill below 3",
          evaluate: (ctx: EvaluationContext) => noSkillBelow(ctx, 3),
        },
        {
          text: "Judgment \u2265 4",
          evaluate: (ctx: EvaluationContext) => valueAtLeast(ctx, "judgment", 4),
        },
        {
          text: "Integrity \u2265 4",
          evaluate: (ctx: EvaluationContext) => valueAtLeast(ctx, "integrity", 4),
        },
        {
          text: "Demonstrated reduction in technical escalations",
          evaluate: (ctx: EvaluationContext) => {
            const v = ctx.metrics.metricCodeEsc;
            if (v == null) return null;
            return (v as number) <= 1;
          },
        },
      ],
    },
  ],

  stabilityNote:
    "Technical authority carries more weight than administrative completion. Code & Regulatory Research is a hard gate for independent authority.",
  valueNote:
    "Rate each SCOPOS value 1\u20135. Values do not override skill gaps. Skill gaps block promotion. Value gaps block trust and expanded authority.",
};

// ---------------------------------------------------------------------------
// ID_CONFIG — Interior Designer
// ---------------------------------------------------------------------------

export const ID_CONFIG: RoleConfig = {
  roleType: "id",
  title: "Interior Designer",
  subtitle: "Performance Evaluation",

  skills: [
    { id: "design", name: "Interior Design Development", weight: 0.15 },
    { id: "ffe", name: "FF&E Selection", weight: 0.10 },
    { id: "doc", name: "Documentation Coordination", weight: 0.20 },
    { id: "client", name: "Client Interaction", weight: 0.15 },
    { id: "qc", name: "Design QC", weight: 0.10 },
    { id: "meeting", name: "Meeting Preparation & Decision Framing", weight: 0.15 },
    { id: "drawing", name: "Drawing Version Control & Discipline", weight: 0.15 },
  ],

  values: [
    { id: "communication", name: "Communication", category: "High Weight" },
    { id: "impact", name: "Impact", category: "High Weight" },
    { id: "innovation", name: "Innovation Courage", category: "High Weight" },
    { id: "curiosity", name: "Curiosity", category: "High Weight" },
    { id: "integrity", name: "Integrity", category: "Non-Negotiable" },
    { id: "judgment", name: "Judgment", category: "Standard" },
    { id: "passion", name: "Passion", category: "Standard" },
    { id: "selflessness", name: "Selflessness", category: "Standard" },
  ],

  metrics: [
    {
      id: "metricRevisions",
      name: "metricRevisions",
      label: "# of drawing revisions due to internal QC misses",
      type: "number",
      min: 0,
      placeholder: "0",
    },
    {
      id: "metricOutdated",
      name: "metricOutdated",
      label: "# of meetings held with outdated drawings",
      type: "number",
      min: 0,
      placeholder: "0",
    },
    {
      id: "metricPrepared",
      name: "metricPrepared",
      label: "% of meetings with prepared decision list",
      type: "percentage",
      min: 0,
      max: 100,
      placeholder: "%",
    },
    {
      id: "metricConflicts",
      name: "metricConflicts",
      label: "# of coordination conflicts identified before PM escalation",
      type: "number",
      min: 0,
      placeholder: "0",
    },
    {
      id: "metricFeedback",
      name: "metricFeedback",
      label: "Client feedback trend",
      type: "select",
      options: ["", "Improving", "Stable", "Declining"],
    },
  ],

  authorityLevels: [
    { value: "supported", label: "Supported Designer" },
    { value: "independent", label: "Independent Designer" },
    { value: "senior", label: "Senior Designer Authority" },
  ],

  promotionTiers: [
    {
      name: "Designer III",
      criteria: [
        {
          text: "\u2265 80% skills at Level 3",
          evaluate: (ctx: EvaluationContext) => {
            const pct = pctSkillsAtOrAbove(ctx, 3);
            return pct == null ? null : pct >= 0.8;
          },
        },
        {
          text: "No skill below Level 2",
          evaluate: (ctx: EvaluationContext) => noSkillBelow(ctx, 2),
        },
        {
          text: "Meeting Preparation \u2265 3",
          evaluate: (ctx: EvaluationContext) => skillAtLeast(ctx, "meeting", 3),
        },
        {
          text: "Drawing Discipline \u2265 3",
          evaluate: (ctx: EvaluationContext) => skillAtLeast(ctx, "drawing", 3),
        },
        {
          text: "No recurring QC failures",
          evaluate: (ctx: EvaluationContext) => skillAtLeast(ctx, "qc", 3),
        },
      ],
    },
    {
      name: "Senior Designer",
      criteria: [
        {
          text: "\u2265 80% skills at Level 4",
          evaluate: (ctx: EvaluationContext) => {
            const pct = pctSkillsAtOrAbove(ctx, 4);
            return pct == null ? null : pct >= 0.8;
          },
        },
        {
          text: "Documentation Coordination \u2265 4",
          evaluate: (ctx: EvaluationContext) => skillAtLeast(ctx, "doc", 4),
        },
        {
          text: "Meeting Preparation \u2265 4",
          evaluate: (ctx: EvaluationContext) => skillAtLeast(ctx, "meeting", 4),
        },
        {
          text: "Client Interaction \u2265 4",
          evaluate: (ctx: EvaluationContext) => skillAtLeast(ctx, "client", 4),
        },
        {
          text: "Communication value \u2265 4",
          evaluate: (ctx: EvaluationContext) => valueAtLeast(ctx, "communication", 4),
        },
        {
          text: "No skill below 3",
          evaluate: (ctx: EvaluationContext) => noSkillBelow(ctx, 3),
        },
      ],
    },
  ],

  stabilityNote:
    "Weight reflects operational impact. Documentation and Meeting Preparation carry the most risk to client-facing deliverables.",
  valueNote:
    "Rate each SCOPOS value 1\u20135. Values do not override skill gaps. Skill gaps block promotion. Value gaps block trust and expanded authority.",
};

// ---------------------------------------------------------------------------
// Role Registry
// ---------------------------------------------------------------------------

export const ROLE_CONFIGS: Record<string, RoleConfig> = {
  ca: CA_CONFIG,
  id: ID_CONFIG,
};

export function getRoleConfig(roleType: string): RoleConfig {
  const config = ROLE_CONFIGS[roleType];
  if (!config) throw new Error(`Unknown role type: ${roleType}`);
  return config;
}
