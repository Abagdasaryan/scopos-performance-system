"use client";

import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useRouter } from "next/navigation";

export default function ReviewCyclesPage() {
  const router = useRouter();
  const cycles = useQuery(api.reviewCycles.listReviewCycles, {});

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
          Review Cycles
        </h1>
        <button
          className="btn btn-primary"
          onClick={() => router.push("/admin/review-cycles/new")}
        >
          New Review Cycle
        </button>
      </div>

      <div className="card">
        <div className="card-body" style={{ padding: 0 }}>
          {cycles === undefined ? (
            <div
              style={{
                padding: 24,
                textAlign: "center",
                color: "var(--ink-muted)",
              }}
            >
              Loading...
            </div>
          ) : cycles.length === 0 ? (
            <div
              style={{
                padding: 24,
                textAlign: "center",
                color: "var(--ink-muted)",
              }}
            >
              No review cycles yet.
            </div>
          ) : (
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Period</th>
                  <th>Status</th>
                  <th>Start Date</th>
                  <th>Due Date</th>
                  <th># Employees</th>
                </tr>
              </thead>
              <tbody>
                {cycles.map((cycle) => (
                  <tr
                    key={cycle._id}
                    onClick={() =>
                      router.push(`/admin/review-cycles/${cycle._id}`)
                    }
                  >
                    <td style={{ fontWeight: 600 }}>{cycle.name}</td>
                    <td>{cycle.period || "\u2014"}</td>
                    <td>
                      <span
                        className={`status-badge ${cycle.status}`}
                      >
                        {cycle.status}
                      </span>
                    </td>
                    <td>{cycle.startDate || "\u2014"}</td>
                    <td>{cycle.dueDate || "\u2014"}</td>
                    <td>{cycle.selectedEmployeeIds?.length ?? 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
