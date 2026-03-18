"use client";

import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { RoleConfig } from "@/lib/types";
import type { SkillRating } from "../../../convex/calculations";
import { computeInflationWarning } from "../../../convex/calculations";
import Card from "../ui/Card";
import SectionHeader from "../ui/SectionHeader";
import MetricInput from "../ui/MetricInput";

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

export default function OperationalMetricsSection({ evaluationId, data, config }: SectionProps) {
  const updateMetric = useMutation(api.evaluations.updateMetric);

  const skillRatings: SkillRating[] = config.skills.map((s) => ({
    id: s.id,
    name: s.name,
    weight: s.weight,
    rating: data.skillRatings[s.id] ?? null,
  }));

  const showInflationWarning = computeInflationWarning(
    skillRatings,
    data.operationalMetrics,
    data.roleType
  );

  const handleChange = (metricId: string, value: number | string | null) => {
    updateMetric({ id: evaluationId, metricId, value });
  };

  return (
    <Card>
      <SectionHeader number={3} title="Operational Impact Metrics" />
      {config.metrics.map((metric) => (
        <MetricInput
          key={metric.id}
          metric={metric}
          value={data.operationalMetrics[metric.id] ?? null}
          onChange={(value) => handleChange(metric.id, value)}
        />
      ))}
      {showInflationWarning && (
        <div className="rule-box warn">
          Score inflation detected: High skill rating conflicts with operational metrics.
          Review and reconcile before finalizing.
        </div>
      )}
    </Card>
  );
}
