export interface SkillDef {
  id: string;
  name: string;
  weight: number;
}

export interface ValueDef {
  id: string;
  name: string;
  category: string;
}

export interface MetricDef {
  id: string;
  name: string;
  label: string;
  type: "number" | "percentage" | "select";
  min?: number;
  max?: number;
  placeholder?: string;
  options?: string[]; // for select type
}

export interface AuthorityLevel {
  value: string;
  label: string;
}

export interface PromotionTier {
  name: string;
  criteria: PromotionCriterionDef[];
}

export interface PromotionCriterionDef {
  text: string;
  evaluate: (context: EvaluationContext) => boolean | null;
}

export interface EvaluationContext {
  skillRatings: Record<string, number | null>;
  valueRatings: Record<string, number | null>;
  metrics: Record<string, number | string | null>;
  skills: SkillDef[];
  values: ValueDef[];
}

export interface RoleConfig {
  roleType: string;
  title: string;
  subtitle: string;
  skills: SkillDef[];
  values: ValueDef[];
  metrics: MetricDef[];
  authorityLevels: AuthorityLevel[];
  promotionTiers: PromotionTier[];
  stabilityNote?: string;
  valueNote?: string;
}

export interface Flag {
  text: string;
  type: "danger" | "warn" | "success";
}

export interface DeficiencyRow {
  gap: string;
  action: string;
  target: string;
  deadline: string;
}

export type EvaluationStatus = "draft" | "submitted" | "reviewed" | "finalized";
