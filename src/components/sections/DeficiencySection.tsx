"use client";

import { useState, useEffect, useCallback } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { RoleConfig } from "@/lib/types";
import type { SkillRating, ValueRating } from "../../../convex/calculations";
import { computeDeficiencyTriggers } from "../../../convex/calculations";
import Card from "../ui/Card";
import SectionHeader from "../ui/SectionHeader";

interface DeficiencyRow {
  gap: string;
  action: string;
  target: string;
  deadline: string;
}

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

export default function DeficiencySection({ evaluationId, data, config }: SectionProps) {
  const updatePlan = useMutation(api.evaluations.updateDeficiencyPlan);

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

  const { triggered, gaps } = computeDeficiencyTriggers(
    skillRatings,
    valueRatings,
    data.roleType
  );

  const buildInitialRows = useCallback((): DeficiencyRow[] => {
    if (data.deficiencyPlan && data.deficiencyPlan.length > 0) {
      return data.deficiencyPlan;
    }
    return gaps.map((gap) => ({ gap, action: "", target: "", deadline: "" }));
  }, [data.deficiencyPlan, gaps]);

  const [rows, setRows] = useState<DeficiencyRow[]>(buildInitialRows);

  useEffect(() => {
    setRows(buildInitialRows());
  }, [buildInitialRows]);

  const handleFieldChange = (
    index: number,
    field: keyof DeficiencyRow,
    value: string
  ) => {
    setRows((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const handleBlur = () => {
    updatePlan({ id: evaluationId, rows });
  };

  return (
    <Card className={`conditional-section${triggered ? " visible" : ""}`}>
      <SectionHeader number={5} title="Deficiency Correction Plan" />
      <table className="def-table">
        <thead>
          <tr>
            <th>Gap Description</th>
            <th>Required Actions</th>
            <th>Target Level</th>
            <th>Target Date</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i}>
              <td>
                <textarea
                  value={row.gap}
                  onChange={(e) => handleFieldChange(i, "gap", e.target.value)}
                  onBlur={handleBlur}
                />
              </td>
              <td>
                <textarea
                  value={row.action}
                  onChange={(e) => handleFieldChange(i, "action", e.target.value)}
                  onBlur={handleBlur}
                />
              </td>
              <td>
                <textarea
                  value={row.target}
                  onChange={(e) => handleFieldChange(i, "target", e.target.value)}
                  onBlur={handleBlur}
                />
              </td>
              <td>
                <input
                  type="date"
                  value={row.deadline}
                  onChange={(e) => handleFieldChange(i, "deadline", e.target.value)}
                  onBlur={handleBlur}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}
