"use client";

import type { RoleConfig } from "@/lib/types";
import type { SkillRating, ValueRating } from "../../../convex/calculations";
import { computeDashboard } from "../../../convex/calculations";
import DashCard from "../ui/DashCard";

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

export default function DashboardSection({ data, config }: SectionProps) {
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

  const cards = computeDashboard(
    skillRatings,
    valueRatings,
    data.operationalMetrics,
    data.authorityLevel,
    data.roleType
  );

  return (
    <div className="dashboard">
      <h2>CEO Dashboard</h2>
      <div className="dash-subtitle">
        {data.empName || "Employee"} &mdash; {config.title}
      </div>
      <div className="dash-grid">
        {cards.map((card) => (
          <DashCard key={card.id} card={card} />
        ))}
      </div>
    </div>
  );
}
