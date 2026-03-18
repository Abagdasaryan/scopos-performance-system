"use client";

import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { RoleConfig } from "@/lib/types";
import type { SkillRating } from "../../../convex/calculations";
import {
  computeWeightedSkillScore,
  computeSkillFlags,
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

export default function SkillsSection({ evaluationId, data, config }: SectionProps) {
  const updateSkill = useMutation(api.evaluations.updateSkillRating);

  const skillRatings: SkillRating[] = config.skills.map((s) => ({
    id: s.id,
    name: s.name,
    weight: s.weight,
    rating: data.skillRatings[s.id] ?? null,
  }));

  const totalWeight = config.skills.reduce((sum, s) => sum + s.weight, 0);
  const weightLabel = `${(totalWeight * 100).toFixed(0)}% weight`;

  const { display: scoreDisplay, score } = computeWeightedSkillScore(skillRatings);
  const flags = computeSkillFlags(skillRatings, data.roleType);

  const handleRate = (skillId: string, rating: number) => {
    updateSkill({ id: evaluationId, skillId, rating });
  };

  return (
    <Card>
      <SectionHeader number={1} title="Role Competency" weight={weightLabel} />
      {config.stabilityNote && (
        <div className="rule-box info">{config.stabilityNote}</div>
      )}
      <table className="rating-table">
        <thead>
          <tr>
            <th>Competency</th>
            <th className="weight-col">Weight</th>
            <th>1</th>
            <th>2</th>
            <th>3</th>
            <th>4</th>
            <th>5</th>
          </tr>
        </thead>
        <tbody>
          {config.skills.map((skill) => (
            <RatingRow
              key={skill.id}
              item={skill}
              group="skill"
              showWeight={true}
              selectedRating={data.skillRatings[skill.id] ?? null}
              onRate={(rating) => handleRate(skill.id, rating)}
            />
          ))}
        </tbody>
      </table>
      <ScoreDisplay
        label="Weighted Skill Score"
        value={scoreDisplay}
        isEmpty={score === null}
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
