"use client";

import type { RoleConfig } from "@/lib/types";
import type { SkillRating, ValueRating } from "../../../convex/calculations";
import { computeExecutiveSummary } from "../../../convex/calculations";
import Card from "../ui/Card";
import SectionHeader from "../ui/SectionHeader";

interface SectionProps {
  evaluationId: any;
  data: {
    roleType: string;
    empName: string;
    empPosition: string;
    reviewer: string;
    reviewDate: string;
    reviewPeriod: string;
    empProject: string;
    skillRatings: Record<string, number | null>;
    valueRatings: Record<string, number | null>;
    operationalMetrics: Record<string, number | string | null>;
    authorityLevel?: string;
    deficiencyPlan?: { gap: string; action: string; target: string; deadline: string }[];
    managerNotes?: string;
    status: string;
  };
  config: RoleConfig;
}

export default function ExecutiveSummarySection({ data, config }: SectionProps) {
  const skillRatings: SkillRating[] = config.skills.map((s) => ({
    id: s.id,
    name: s.name,
    weight: s.weight,
    rating: data.skillRatings[s.id] ?? null,
  }));

  const valueRatings: ValueRating[] = config.values.map((v) => ({
    id: v.id,
    name: v.name,
    category: v.category,
    rating: data.valueRatings[v.id] ?? null,
  }));

  const metrics = computeExecutiveSummary(
    skillRatings,
    valueRatings,
    data.operationalMetrics,
    data.roleType
  );

  return (
    <Card>
      <SectionHeader number={7} title="Executive Summary" />
      {metrics.map((metric, i) => (
        <div key={i} className="exec-row">
          <span className="exec-label">{metric.label}</span>
          <span className={`exec-value ${metric.className}`}>{metric.value}</span>
        </div>
      ))}
    </Card>
  );
}
