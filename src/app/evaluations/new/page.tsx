"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useRouter } from "next/navigation";
import { ROLE_CONFIGS } from "@/lib/roleConfig";
import EmployeePicker from "@/components/ui/EmployeePicker";
import type { Id } from "../../../../convex/_generated/dataModel";

export default function NewEvaluationPage() {
  const createEvaluation = useMutation(api.evaluations.createEvaluation);
  const createEvalForEmployee = useMutation(api.evaluations.createEvaluationForEmployee);
  const employees = useQuery(api.employees.getAllEmployees, {});
  const router = useRouter();

  const [selectedEmployee, setSelectedEmployee] = useState<string | null>(null);
  const [reviewerId, setReviewerId] = useState<string | null>(null);

  const selectedEmp = selectedEmployee
    ? employees?.find((e) => e._id === selectedEmployee)
    : null;

  const handleCreate = async (roleType: string) => {
    if (selectedEmployee && reviewerId) {
      const id = await createEvalForEmployee({
        employeeId: selectedEmployee as Id<"employees">,
        reviewerId: reviewerId as Id<"employees">,
        roleType,
      });
      router.push(`/evaluations/${id}`);
    } else {
      const id = await createEvaluation({ roleType });
      router.push(`/evaluations/${id}`);
    }
  };

  return (
    <div className="container">
      <h1 style={{ fontFamily: "var(--font-fraunces), 'Fraunces', serif", fontSize: 24, marginBottom: 24 }}>
        New Evaluation
      </h1>

      {/* Employee Selection */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-body">
          <label
            style={{
              fontSize: 12,
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.8px",
              color: "var(--ink-muted)",
              display: "block",
              marginBottom: 8,
            }}
          >
            Employee (optional)
          </label>
          <EmployeePicker
            employees={employees ?? []}
            selected={selectedEmployee}
            onSelect={setSelectedEmployee}
            placeholder="Select employee for evaluation..."
          />
          {selectedEmp?.roleType && (
            <p style={{ color: "var(--ink-soft)", fontSize: 13, marginTop: 8 }}>
              Role: {ROLE_CONFIGS[selectedEmp.roleType]?.title ?? selectedEmp.roleType} (will be used automatically)
            </p>
          )}
        </div>
      </div>

      {selectedEmployee && (
        <div className="card" style={{ marginBottom: 20 }}>
          <div className="card-body">
            <label
              style={{
                fontSize: 12,
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: "0.8px",
                color: "var(--ink-muted)",
                display: "block",
                marginBottom: 8,
              }}
            >
              Reviewer
            </label>
            <EmployeePicker
              employees={(employees ?? []).filter((e) => e._id !== selectedEmployee)}
              selected={reviewerId}
              onSelect={setReviewerId}
              placeholder="Select reviewer..."
            />
          </div>
        </div>
      )}

      <p style={{ color: "var(--ink-soft)", marginBottom: 24 }}>Select the role type for this evaluation:</p>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        {Object.values(ROLE_CONFIGS).map((config) => (
          <button
            key={config.roleType}
            onClick={() => handleCreate(config.roleType)}
            className="card"
            style={{ cursor: "pointer", textAlign: "left", border: "2px solid var(--border-light)", transition: "all 0.2s" }}
          >
            <div className="card-body">
              <h2 style={{ fontFamily: "var(--font-fraunces), 'Fraunces', serif", fontSize: 20, marginBottom: 8 }}>
                {config.title}
              </h2>
              <p style={{ color: "var(--ink-soft)", fontSize: 14 }}>
                {config.subtitle} — {config.skills.length} competencies, {config.values.length} values
              </p>
              {selectedEmp?.roleType === config.roleType && (
                <span className="status-badge active" style={{ marginTop: 8 }}>
                  Employee default
                </span>
              )}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
