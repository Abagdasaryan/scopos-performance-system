"use client";

import type { RoleConfig, EvaluationContext } from "@/lib/types";
import Card from "../ui/Card";
import SectionHeader from "../ui/SectionHeader";
import PromoCheck from "../ui/PromoCheck";
import ScoreDisplay from "../ui/ScoreDisplay";

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

export default function PromotionSection({ data, config }: SectionProps) {
  const context: EvaluationContext = {
    skillRatings: data.skillRatings,
    valueRatings: data.valueRatings,
    metrics: data.operationalMetrics,
    skills: config.skills,
    values: config.values,
  };

  const tiers = config.promotionTiers.map((tier) => {
    const criteria = tier.criteria.map((c) => ({
      text: c.text,
      met: c.evaluate(context),
    }));
    const allMet = criteria.every((c) => c.met === true);
    const anyNull = criteria.some((c) => c.met === null);
    return {
      name: tier.name,
      criteria,
      passed: anyNull ? null : allMet,
    };
  });

  // Determine overall status
  let statusText = "\u2717 Not Yet Eligible";
  let isEmpty = true;
  for (let i = tiers.length - 1; i >= 0; i--) {
    if (tiers[i].passed === true) {
      statusText = `\u2713 ${tiers[i].name} Eligible`;
      isEmpty = false;
      break;
    }
  }

  return (
    <Card>
      <SectionHeader number={6} title="Promotion Readiness" />
      {tiers.map((tier) => (
        <div key={tier.name}>
          <div className="promo-group-title">{tier.name}</div>
          {tier.criteria.map((criterion, i) => (
            <PromoCheck key={i} text={criterion.text} met={criterion.met} />
          ))}
        </div>
      ))}
      <ScoreDisplay
        label="Promotion Status"
        value={statusText}
        isEmpty={isEmpty}
      />
    </Card>
  );
}
