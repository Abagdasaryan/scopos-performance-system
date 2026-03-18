"use client";

import { useMemo } from "react";
import { getRoleConfig } from "@/lib/roleConfig";
import {
  computeWeightedSkillScore,
  computeAverageValueScore,
  computeCompositeScore,
  computeSkillFlags,
  computeValueFlags,
  computeAuthorityFlags,
  computeDeficiencyTriggers,
  computeInflationWarning,
  computePromotionCriteria,
  computeExecutiveSummary,
  computeDashboard,
  type SkillRating,
  type ValueRating,
} from "../../convex/calculations";

interface EvaluationData {
  roleType: string;
  skillRatings: Record<string, number | null>;
  valueRatings: Record<string, number | null>;
  operationalMetrics: Record<string, number | string | null>;
  authorityLevel?: string;
}

export function useCalculations(data: EvaluationData | null | undefined) {
  const config = data ? getRoleConfig(data.roleType) : null;

  return useMemo(() => {
    if (!data || !config) return null;

    // Build SkillRating[] and ValueRating[] arrays by merging config definitions with actual ratings
    const skillRatings: SkillRating[] = config.skills.map(s => ({
      id: s.id,
      name: s.name,
      weight: s.weight,
      rating: data.skillRatings[s.id] ?? null,
    }));

    const valueRatings: ValueRating[] = config.values.map(v => ({
      id: v.id,
      name: v.name,
      category: v.category,
      rating: data.valueRatings[v.id] ?? null,
    }));

    const skillScore = computeWeightedSkillScore(skillRatings);
    const valueScore = computeAverageValueScore(valueRatings);
    const composite = computeCompositeScore(skillScore.score, valueScore.score);
    const skillFlags = computeSkillFlags(skillRatings, data.roleType);
    const valueFlags = computeValueFlags(valueRatings, data.roleType);
    const authorityFlags = computeAuthorityFlags(skillRatings, data.roleType);
    const deficiency = computeDeficiencyTriggers(skillRatings, valueRatings, data.roleType);
    const inflationWarning = computeInflationWarning(skillRatings, data.operationalMetrics, data.roleType);
    const promotion = computePromotionCriteria(skillRatings, valueRatings, data.operationalMetrics, data.roleType);
    const executive = computeExecutiveSummary(skillRatings, valueRatings, data.operationalMetrics, data.roleType);
    const dashboard = computeDashboard(skillRatings, valueRatings, data.operationalMetrics, data.authorityLevel, data.roleType);

    return {
      config,
      skillRatings,
      valueRatings,
      skillScore,
      valueScore,
      composite,
      skillFlags,
      valueFlags,
      authorityFlags,
      deficiency,
      inflationWarning,
      promotion,
      executive,
      dashboard,
    };
  }, [data, config]);
}
