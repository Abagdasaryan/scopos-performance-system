"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useRouter } from "next/navigation";
import { ROLE_CONFIGS, getRoleConfig } from "@/lib/roleConfig";
import {
  computeWeightedSkillScore,
  computeAverageValueScore,
  computeCompositeScore,
  type SkillRating,
  type ValueRating,
} from "../../../convex/calculations";
import type { Id } from "../../../convex/_generated/dataModel";

export default function MyTeamPage() {
  const router = useRouter();
  const authStatus = useQuery(api.auth.getAuthStatus);
  const managerId =
    authStatus?.status === "authenticated"
      ? authStatus.employee._id
      : undefined;

  const [creatingFor, setCreatingFor] = useState<string | null>(null);
  const [roleSelectFor, setRoleSelectFor] = useState<string | null>(null);
  const [selectedRole, setSelectedRole] = useState("");

  const reports = useQuery(
    api.employees.getDirectReports,
    managerId ? { managerId } : "skip"
  );
  const evals = useQuery(
    api.evaluations.getEvaluationsForReviewer,
    managerId ? { reviewerId: managerId } : "skip"
  );

  const createEval = useMutation(api.evaluations.createEvaluationForEmployee);

  function getComposite(ev: {
    roleType: string;
    skillRatings: Record<string, number | null>;
    valueRatings: Record<string, number | null>;
  }): string {
    try {
      const config = getRoleConfig(ev.roleType);
      const skills: SkillRating[] = config.skills.map((s) => ({
        id: s.id,
        name: s.name,
        weight: s.weight,
        rating: ev.skillRatings[s.id] ?? null,
      }));
      const values: ValueRating[] = config.values.map((v) => ({
        id: v.id,
        name: v.name,
        category: v.category,
        rating: ev.valueRatings[v.id] ?? null,
      }));
      const skillScore = computeWeightedSkillScore(skills);
      const valueScore = computeAverageValueScore(values);
      return computeCompositeScore(skillScore.score, valueScore.score).display;
    } catch {
      return "\u2014";
    }
  }

  async function handleStartReview(empId: string, roleType?: string) {
    if (!managerId) return;
    if (!roleType) {
      setRoleSelectFor(empId);
      return;
    }
    setCreatingFor(empId);
    try {
      const evalId = await createEval({
        employeeId: empId as Id<"employees">,
        roleType,
      });
      router.push(`/evaluations/${evalId}`);
    } catch {
      alert("Failed to create evaluation.");
    } finally {
      setCreatingFor(null);
    }
  }

  const draftEvals =
    evals?.filter((e) => e.status === "draft") ?? [];
  const completedEvals =
    evals?.filter(
      (e) => e.status === "submitted" || e.status === "finalized"
    ) ?? [];

  if (authStatus === undefined) {
    return (
      <div className="container">
        <p style={{ color: "var(--ink-muted)" }}>Loading...</p>
      </div>
    );
  }

  return (
    <div className="container">
      <h1
        style={{
          fontFamily: "var(--font-fraunces), 'Fraunces', serif",
          fontSize: 24,
          marginBottom: 16,
        }}
      >
        My Team
      </h1>

      {managerId && (
        <>
          {/* Direct Reports */}
          <h2
            style={{
              fontFamily: "var(--font-fraunces), 'Fraunces', serif",
              fontSize: 18,
              marginBottom: 12,
            }}
          >
            Direct Reports
          </h2>
          {reports === undefined ? (
            <p style={{ color: "var(--ink-muted)" }}>Loading...</p>
          ) : reports.length === 0 ? (
            <p style={{ color: "var(--ink-muted)", marginBottom: 24 }}>
              No direct reports found for this manager.
            </p>
          ) : (
            <div className="report-cards" style={{ marginBottom: 32 }}>
              {reports.map((emp) => {
                // Find most recent finalized eval for this employee
                const empEvals = evals?.filter(
                  (e) =>
                    e.employeeId === emp._id && e.status === "finalized"
                );
                const lastEval =
                  empEvals && empEvals.length > 0
                    ? empEvals[empEvals.length - 1]
                    : null;

                return (
                  <div className="report-card" key={emp._id}>
                    <div className="report-name">{emp.name}</div>
                    <div className="report-title">
                      {emp.title || "No title"}
                    </div>
                    <div className="report-meta">
                      {emp.roleType && (
                        <span>
                          {ROLE_CONFIGS[emp.roleType]?.title ?? emp.roleType}
                        </span>
                      )}
                      {lastEval && (
                        <>
                          <span>
                            Last: {lastEval.reviewDate || "\u2014"}
                          </span>
                          <span>Score: {getComposite(lastEval)}</span>
                        </>
                      )}
                    </div>
                    <div className="report-actions">
                      {roleSelectFor === emp._id ? (
                        <div
                          style={{
                            display: "flex",
                            gap: 8,
                            alignItems: "center",
                          }}
                        >
                          <select
                            className="metric-input"
                            value={selectedRole}
                            onChange={(e) => setSelectedRole(e.target.value)}
                            style={{ textAlign: "left" }}
                          >
                            <option value="">Select role...</option>
                            {Object.entries(ROLE_CONFIGS).map(
                              ([key, config]) => (
                                <option key={key} value={key}>
                                  {config.title}
                                </option>
                              )
                            )}
                          </select>
                          <button
                            className="btn btn-primary"
                            style={{ padding: "6px 14px", fontSize: 12 }}
                            disabled={!selectedRole}
                            onClick={() => {
                              handleStartReview(emp._id, selectedRole);
                              setRoleSelectFor(null);
                              setSelectedRole("");
                            }}
                          >
                            Start
                          </button>
                          <button
                            className="btn btn-secondary"
                            style={{ padding: "6px 14px", fontSize: 12 }}
                            onClick={() => {
                              setRoleSelectFor(null);
                              setSelectedRole("");
                            }}
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          className="btn btn-primary"
                          style={{ padding: "6px 14px", fontSize: 12 }}
                          disabled={creatingFor === emp._id}
                          onClick={() =>
                            handleStartReview(emp._id, emp.roleType)
                          }
                        >
                          {creatingFor === emp._id
                            ? "Creating..."
                            : "Start Review"}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* In-Progress */}
          {draftEvals.length > 0 && (
            <>
              <h2
                style={{
                  fontFamily: "var(--font-fraunces), 'Fraunces', serif",
                  fontSize: 18,
                  marginBottom: 12,
                }}
              >
                In Progress
              </h2>
              <div className="card" style={{ marginBottom: 24 }}>
                <div className="card-body" style={{ padding: 0 }}>
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Employee</th>
                        <th>Role</th>
                        <th>Status</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {draftEvals.map((ev) => (
                        <tr
                          key={ev._id}
                          onClick={() =>
                            router.push(`/evaluations/${ev._id}`)
                          }
                        >
                          <td style={{ fontWeight: 600 }}>
                            {ev.empName || "Unknown"}
                          </td>
                          <td>
                            {ROLE_CONFIGS[ev.roleType]?.title ?? ev.roleType}
                          </td>
                          <td>
                            <span className="status-badge draft">
                              Draft
                            </span>
                          </td>
                          <td
                            style={{
                              color: "var(--accent)",
                              fontWeight: 500,
                            }}
                          >
                            Continue
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

          {/* Completed */}
          {completedEvals.length > 0 && (
            <>
              <h2
                style={{
                  fontFamily: "var(--font-fraunces), 'Fraunces', serif",
                  fontSize: 18,
                  marginBottom: 12,
                }}
              >
                Completed
              </h2>
              <div className="card">
                <div className="card-body" style={{ padding: 0 }}>
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Employee</th>
                        <th>Date</th>
                        <th>Composite</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {completedEvals.map((ev) => (
                        <tr
                          key={ev._id}
                          onClick={() =>
                            router.push(`/evaluations/${ev._id}`)
                          }
                        >
                          <td style={{ fontWeight: 600 }}>
                            {ev.empName || "Unknown"}
                          </td>
                          <td>{ev.reviewDate || "\u2014"}</td>
                          <td style={{ fontWeight: 600 }}>
                            {getComposite(ev)}
                          </td>
                          <td>
                            <span
                              className={`status-badge ${ev.status === "finalized" ? "active" : "draft"}`}
                            >
                              {ev.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
