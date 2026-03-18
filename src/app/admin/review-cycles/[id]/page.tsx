"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { useRouter, useParams } from "next/navigation";
import type { Id } from "../../../../../convex/_generated/dataModel";

export default function ReviewCycleDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const cycle = useQuery(api.reviewCycles.getReviewCycle, {
    id: id as Id<"reviewCycles">,
  });
  const progress = useQuery(api.reviewCycles.getCycleProgress, {
    cycleId: id as Id<"reviewCycles">,
  });
  const activateCycle = useMutation(api.reviewCycles.activateReviewCycle);
  const closeCycle = useMutation(api.reviewCycles.closeReviewCycle);

  const [activating, setActivating] = useState(false);
  const [activateResult, setActivateResult] = useState<{
    created: number;
    skipped: { noManager: string[]; noRoleType: string[] };
  } | null>(null);
  const [error, setError] = useState("");

  async function handleActivate() {
    if (
      !confirm(
        "Activate this review cycle? This will create evaluations for all selected employees."
      )
    )
      return;
    setActivating(true);
    setError("");
    try {
      const result = await activateCycle({
        id: id as Id<"reviewCycles">,
      });
      setActivateResult(result);
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Failed to activate cycle."
      );
    } finally {
      setActivating(false);
    }
  }

  async function handleClose() {
    if (!confirm("Close this review cycle?")) return;
    setError("");
    try {
      await closeCycle({ id: id as Id<"reviewCycles"> });
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Failed to close cycle."
      );
    }
  }

  if (cycle === undefined) {
    return (
      <div className="container">
        <p style={{ color: "var(--ink-muted)" }}>Loading...</p>
      </div>
    );
  }
  if (cycle === null) {
    return (
      <div className="container">
        <p style={{ color: "var(--danger)" }}>Review cycle not found.</p>
      </div>
    );
  }

  return (
    <div className="container">
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 24,
        }}
      >
        <h1
          style={{
            fontFamily: "var(--font-fraunces), 'Fraunces', serif",
            fontSize: 24,
          }}
        >
          {cycle.name}
        </h1>
        <span className={`status-badge ${cycle.status}`}>
          {cycle.status}
        </span>
      </div>

      {error && (
        <div className="rule-box warn" style={{ margin: "0 0 20px" }}>
          {error}
        </div>
      )}

      {activateResult && (
        <div className="rule-box info" style={{ margin: "0 0 20px" }}>
          Created {activateResult.created} evaluations.
          {(activateResult.skipped.noManager.length > 0 || activateResult.skipped.noRoleType.length > 0) && (
            <ul style={{ marginTop: 8, paddingLeft: 20 }}>
              {activateResult.skipped.noManager.length > 0 && (
                <li>Skipped (no manager): {activateResult.skipped.noManager.join(", ")}</li>
              )}
              {activateResult.skipped.noRoleType.length > 0 && (
                <li>Skipped (no role type): {activateResult.skipped.noRoleType.join(", ")}</li>
              )}
            </ul>
          )}
        </div>
      )}

      {/* Cycle Info */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div
          className="info-grid"
          style={{
            borderRadius: "var(--radius)",
            border: "1px solid var(--border-light)",
          }}
        >
          <div>
            <label>Period</label>
            <div style={{ padding: "6px 0", fontSize: 15 }}>
              {cycle.period || "\u2014"}
            </div>
          </div>
          <div>
            <label>Status</label>
            <div style={{ padding: "6px 0", fontSize: 15 }}>
              {cycle.status}
            </div>
          </div>
          <div>
            <label>Start Date</label>
            <div style={{ padding: "6px 0", fontSize: 15 }}>
              {cycle.startDate || "\u2014"}
            </div>
          </div>
          <div>
            <label>Due Date</label>
            <div style={{ padding: "6px 0", fontSize: 15 }}>
              {cycle.dueDate || "\u2014"}
            </div>
          </div>
        </div>
      </div>

      {/* Progress */}
      {progress && (
        <div className="stat-grid" style={{ marginBottom: 20 }}>
          <div className="stat-card">
            <div className="stat-value">{progress.total}</div>
            <div className="stat-label">Total Evaluations</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{progress.completed}</div>
            <div className="stat-label">Completed</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{progress.pending}</div>
            <div className="stat-label">Pending</div>
          </div>
        </div>
      )}

      {/* Manager Breakdown */}
      {progress?.byReviewer && progress.byReviewer.length > 0 && (
        <div className="card" style={{ marginBottom: 20 }}>
          <div className="card-body" style={{ paddingBottom: 0 }}>
            <h2
              style={{
                fontFamily: "var(--font-fraunces), 'Fraunces', serif",
                fontSize: 18,
                marginBottom: 12,
              }}
            >
              Manager Breakdown
            </h2>
          </div>
          <div className="card-body" style={{ padding: 0 }}>
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Manager</th>
                  <th>Assigned</th>
                  <th>Completed</th>
                </tr>
              </thead>
              <tbody>
                {progress.byReviewer.map(
                  (m: { name: string; total: number; completed: number }, i: number) => (
                    <tr key={i} style={{ cursor: "default" }}>
                      <td style={{ fontWeight: 600 }}>{m.name}</td>
                      <td>{m.total}</td>
                      <td>{m.completed}</td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Evaluations */}
      {progress?.evaluations && progress.evaluations.length > 0 && (
        <div className="card" style={{ marginBottom: 20 }}>
          <div className="card-body" style={{ paddingBottom: 0 }}>
            <h2
              style={{
                fontFamily: "var(--font-fraunces), 'Fraunces', serif",
                fontSize: 18,
                marginBottom: 12,
              }}
            >
              Evaluations
            </h2>
          </div>
          <div className="card-body" style={{ padding: 0 }}>
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Status</th>
                  <th>Reviewer</th>
                </tr>
              </thead>
              <tbody>
                {progress.evaluations.map(
                  (ev) => (
                    <tr
                      key={ev._id}
                      onClick={() =>
                        router.push(`/evaluations/${ev._id}`)
                      }
                    >
                      <td style={{ fontWeight: 600 }}>
                        {ev.empName}
                      </td>
                      <td>
                        <span
                          className={`status-badge ${ev.status}`}
                        >
                          {ev.status}
                        </span>
                      </td>
                      <td>{ev.reviewer || "\u2014"}</td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="actions-bar">
        <button
          className="btn btn-secondary"
          onClick={() => router.push("/admin/review-cycles")}
        >
          Back to Cycles
        </button>
        {cycle.status === "draft" && (
          <button
            className="btn btn-primary"
            onClick={handleActivate}
            disabled={activating}
          >
            {activating ? "Activating..." : "Activate Cycle"}
          </button>
        )}
        {cycle.status === "active" && (
          <button className="btn btn-primary" onClick={handleClose}>
            Close Cycle
          </button>
        )}
      </div>
    </div>
  );
}
