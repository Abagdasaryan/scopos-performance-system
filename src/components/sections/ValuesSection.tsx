"use client";

import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { RoleConfig } from "@/lib/types";
import type { SkillRating, ValueRating } from "../../../convex/calculations";
import {
  computeWeightedSkillScore,
  computeAverageValueScore,
  computeCompositeScore,
  computeValueFlags,
} from "../../../convex/calculations";
import Card from "../ui/Card";
import SectionHeader from "../ui/SectionHeader";
import RatingRow from "../ui/RatingRow";
import ScoreDisplay from "../ui/ScoreDisplay";
import Flag from "../ui/Flag";

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

export default function ValuesSection({ evaluationId, data, config }: SectionProps) {
  const updateValue = useMutation(api.evaluations.updateValueRating);

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

  const { score: skillScore } = computeWeightedSkillScore(skillRatings);
  const { display: valueDisplay, score: valueScore } = computeAverageValueScore(valueRatings);
  const { display: compositeDisplay, score: compositeScore } = computeCompositeScore(
    skillScore,
    valueScore
  );
  const flags = computeValueFlags(valueRatings, data.roleType);

  const handleRate = (valueId: string, rating: number) => {
    updateValue({ id: evaluationId, valueId, rating });
  };

  return (
    <Card>
      <SectionHeader number={2} title="Core Values Alignment" />
      {config.valueNote && (
        <div className="rule-box info">{config.valueNote}</div>
      )}
      <table className="rating-table">
        <thead>
          <tr>
            <th>Value</th>
            <th className="weight-col">Category</th>
            <th>1</th>
            <th>2</th>
            <th>3</th>
            <th>4</th>
            <th>5</th>
          </tr>
        </thead>
        <tbody>
          {config.values.map((value) => (
            <RatingRow
              key={value.id}
              item={value}
              group="value"
              showWeight={false}
              selectedRating={data.valueRatings[value.id] ?? null}
              onRate={(rating) => handleRate(value.id, rating)}
            />
          ))}
        </tbody>
      </table>
      <ScoreDisplay
        label="Average Value Score"
        value={valueDisplay}
        isEmpty={valueScore === null}
      />
      <ScoreDisplay
        label="Composite Score (70/30)"
        value={compositeDisplay}
        isEmpty={compositeScore === null}
      />
      {flags.length > 0 && (
        <div className="flags-container">
          {flags.map((flag, i) => (
            <Flag key={i} text={flag.text} type={flag.type} />
          ))}
        </div>
      )}
    </Card>
  );
}
