"use client";

import { useState, useMemo } from "react";
import { useQuery } from "convex/react";
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

type StatusFilter = "" | "draft" | "submitted" | "reviewed" | "finalized";

export default function EvaluationsPage() {
  const router = useRouter();
  const [roleFilter, setRoleFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("");
  const [search, setSearch] = useState("");

  const queryArgs: Record<string, string> = {};
  if (roleFilter) queryArgs.roleType = roleFilter;
  if (statusFilter) queryArgs.status = statusFilter;

  const evaluations = useQuery(api.evaluations.listEvaluations, queryArgs);

  // Client-side search filter on employee name
  const filtered = useMemo(() => {
    if (!evaluations) return [];
    if (!search.trim()) return evaluations;
    const q = search.toLowerCase();
    return evaluations.filter(
      (e) =>
        e.empName?.toLowerCase().includes(q) ||
        e.reviewer?.toLowerCase().includes(q)
    );
  }, [evaluations, search]);

  // Summary stats
  const stats = useMemo(() => {
    if (!evaluations) return { total: 0, draft: 0, submitted: 0, reviewed: 0, finalized: 0, ca: 0, id: 0 };
    return {
      total: evaluations.length,
      draft: evaluations.filter((e) => e.status === "draft").length,
      submitted: evaluations.filter((e) => e.status === "submitted").length,
      reviewed: evaluations.filter((e) => e.status === "reviewed").length,
      finalized: evaluations.filter((e) => e.status === "finalized").length,
      ca: evaluations.filter((e) => e.roleType === "ca").length,
      id: evaluations.filter((e) => e.roleType === "id").length,
    };
  }, [evaluations]);

  // Compute composite score for an evaluation
  function getCompositeDisplay(e: {
    roleType: string;
    skillRatings: Record<string, number | null>;
    valueRatings: Record<string, number | null>;
  }): string {
    try {
      const config = getRoleConfig(e.roleType);
      const skills: SkillRating[] = config.skills.map((s) => ({
        id: s.id,
        name: s.name,
        weight: s.weight,
        rating: e.skillRatings[s.id] ?? null,
      }));
      const values: ValueRating[] = config.values.map((v) => ({
        id: v.id,
        name: v.name,
        category: v.category,
        rating: e.valueRatings[v.id] ?? null,
      }));
      const skillScore = computeWeightedSkillScore(skills);
      const valueScore = computeAverageValueScore(values);
      return computeCompositeScore(skillScore.score, valueScore.score).display;
    } catch {
      return "\u2014";
    }
  }

  function statusBadgeClass(status: string): string {
    switch (status) {
      case "draft":
        return "flag flag-warn";
      case "submitted":
        return "flag flag-info";
      case "reviewed":
        return "flag flag-success";
      case "finalized":
        return "flag flag-success";
      default:
        return "flag";
    }
  }

  function roleLabel(roleType: string): string {
    return ROLE_CONFIGS[roleType]?.title ?? roleType;
  }

  function formatDate(dateStr: string): string {
    if (!dateStr) return "\u2014";
    return dateStr;
  }

  return (
    <div className="container">
      <h1
        style={{
          fontFamily: "var(--font-fraunces), 'Fraunces', serif",
          fontSize: 24,
          marginBottom: 24,
        }}
      >
        Evaluations
      </h1>

      {/* Summary Stats */}
      <div className="info-grid" style={{ marginBottom: 24 }}>
        <div className="card">
          <div className="card-body" style={{ textAlign: "center" }}>
            <div style={{ fontSize: 28, fontWeight: 700 }}>{stats.total}</div>
            <div style={{ color: "var(--ink-soft)", fontSize: 13 }}>Total</div>
          </div>
        </div>
        <div className="card">
          <div className="card-body" style={{ textAlign: "center" }}>
            <div style={{ fontSize: 28, fontWeight: 700 }}>{stats.draft}</div>
            <div style={{ color: "var(--ink-soft)", fontSize: 13 }}>Draft</div>
          </div>
        </div>
        <div className="card">
          <div className="card-body" style={{ textAlign: "center" }}>
            <div style={{ fontSize: 28, fontWeight: 700 }}>{stats.submitted}</div>
            <div style={{ color: "var(--ink-soft)", fontSize: 13 }}>Submitted</div>
          </div>
        </div>
        <div className="card">
          <div className="card-body" style={{ textAlign: "center" }}>
            <div style={{ fontSize: 28, fontWeight: 700 }}>{stats.finalized}</div>
            <div style={{ color: "var(--ink-soft)", fontSize: 13 }}>Finalized</div>
          </div>
        </div>
      </div>

      {/* Filter Row */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div className="card-body" style={{ display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <label style={{ fontSize: 12, color: "var(--ink-soft)", fontWeight: 600 }}>Role</label>
            <select
              className="input"
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              style={{ minWidth: 180 }}
            >
              <option value="">All Roles</option>
              {Object.values(ROLE_CONFIGS).map((c) => (
                <option key={c.roleType} value={c.roleType}>
                  {c.title}
                </option>
              ))}
            </select>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <label style={{ fontSize: 12, color: "var(--ink-soft)", fontWeight: 600 }}>Status</label>
            <select
              className="input"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
              style={{ minWidth: 150 }}
            >
              <option value="">All Statuses</option>
              <option value="draft">Draft</option>
              <option value="submitted">Submitted</option>
              <option value="reviewed">Reviewed</option>
              <option value="finalized">Finalized</option>
            </select>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4, flex: 1 }}>
            <label style={{ fontSize: 12, color: "var(--ink-soft)", fontWeight: 600 }}>Search</label>
            <input
              className="input"
              type="text"
              placeholder="Search by employee or reviewer name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="card">
        <div className="card-body" style={{ padding: 0 }}>
          {evaluations === undefined ? (
            <div style={{ padding: 24, textAlign: "center", color: "var(--ink-soft)" }}>Loading...</div>
          ) : filtered.length === 0 ? (
            <div style={{ padding: 24, textAlign: "center", color: "var(--ink-soft)" }}>
              No evaluations found. <a href="/evaluations/new" style={{ color: "var(--accent)" }}>Create one</a>
            </div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "2px solid var(--border-light)" }}>
                  <th style={{ padding: "12px 16px", textAlign: "left", fontSize: 13, fontWeight: 600, color: "var(--ink-soft)" }}>
                    Employee
                  </th>
                  <th style={{ padding: "12px 16px", textAlign: "left", fontSize: 13, fontWeight: 600, color: "var(--ink-soft)" }}>
                    Role
                  </th>
                  <th style={{ padding: "12px 16px", textAlign: "left", fontSize: 13, fontWeight: 600, color: "var(--ink-soft)" }}>
                    Review Date
                  </th>
                  <th style={{ padding: "12px 16px", textAlign: "left", fontSize: 13, fontWeight: 600, color: "var(--ink-soft)" }}>
                    Status
                  </th>
                  <th style={{ padding: "12px 16px", textAlign: "right", fontSize: 13, fontWeight: 600, color: "var(--ink-soft)" }}>
                    Composite
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((e) => (
                  <tr
                    key={e._id}
                    onClick={() => router.push(`/evaluations/${e._id}`)}
                    style={{
                      borderBottom: "1px solid var(--border-light)",
                      cursor: "pointer",
                      transition: "background 0.15s",
                    }}
                    onMouseEnter={(ev) => (ev.currentTarget.style.background = "var(--bg-alt)")}
                    onMouseLeave={(ev) => (ev.currentTarget.style.background = "")}
                  >
                    <td style={{ padding: "12px 16px", fontWeight: 500 }}>
                      {e.empName || "(Unnamed)"}
                    </td>
                    <td style={{ padding: "12px 16px", color: "var(--ink-soft)" }}>
                      {roleLabel(e.roleType)}
                    </td>
                    <td style={{ padding: "12px 16px", color: "var(--ink-soft)" }}>
                      {formatDate(e.reviewDate)}
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      <span className={statusBadgeClass(e.status)}>{e.status}</span>
                    </td>
                    <td style={{ padding: "12px 16px", textAlign: "right", fontWeight: 600 }}>
                      {getCompositeDisplay(e)}
                    </td>
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
