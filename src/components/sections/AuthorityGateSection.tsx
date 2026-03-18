"use client";

import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { RoleConfig } from "@/lib/types";
import type { SkillRating } from "../../../convex/calculations";
import { computeAuthorityFlags } from "../../../convex/calculations";
import Card from "../ui/Card";
import SectionHeader from "../ui/SectionHeader";
import AuthoritySelector from "../ui/AuthoritySelector";
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

export default function AuthorityGateSection({ evaluationId, data, config }: SectionProps) {
  const updateAuthority = useMutation(api.evaluations.updateAuthorityLevel);

  const skillRatings: SkillRating[] = config.skills.map((s) => ({
    id: s.id,
    name: s.name,
    weight: s.weight,
    rating: data.skillRatings[s.id] ?? null,
  }));

  const flags = computeAuthorityFlags(skillRatings, data.roleType);

  const handleSelect = (value: string) => {
    updateAuthority({ id: evaluationId, level: value });
  };

  return (
    <Card>
      <SectionHeader
        number={4}
        title="Authority Status"
        description="Authority must align with measured competency."
      />
      <AuthoritySelector
        levels={config.authorityLevels}
        selected={data.authorityLevel}
        onSelect={handleSelect}
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
