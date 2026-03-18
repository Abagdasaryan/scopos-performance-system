"use client";

import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useRef } from "react";
import type { RoleConfig } from "@/lib/types";

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

const FIELDS = [
  { key: "empName", label: "Employee Name" },
  { key: "reviewDate", label: "Review Date" },
  { key: "empPosition", label: "Position / Title" },
  { key: "reviewer", label: "Reviewer" },
  { key: "reviewPeriod", label: "Review Period" },
  { key: "empProject", label: "Project" },
] as const;

export default function EmployeeInfoSection({ evaluationId, data }: SectionProps) {
  const updateInfo = useMutation(api.evaluations.updateEmployeeInfo);
  const refs = useRef<Record<string, string>>({});

  const handleBlur = (field: string, value: string) => {
    const dataValue = data[field as keyof typeof data] as string;
    if (value !== dataValue) {
      updateInfo({ id: evaluationId, [field]: value });
    }
  };

  return (
    <div className="info-grid">
      {FIELDS.map(({ key, label }) => (
        <div key={key}>
          <label>{label}</label>
          <input
            type={key === "reviewDate" ? "date" : "text"}
            defaultValue={data[key as keyof typeof data] as string}
            ref={(el) => {
              if (el) refs.current[key] = el.value;
            }}
            onBlur={(e) => handleBlur(key, e.target.value)}
          />
        </div>
      ))}
    </div>
  );
}
