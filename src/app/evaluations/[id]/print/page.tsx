"use client";

import { useParams } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { useCalculations } from "@/hooks/useCalculations";
import { Id } from "../../../../../convex/_generated/dataModel";
import Image from "next/image";

export default function PrintPage() {
  const params = useParams();
  const id = params.id as string;

  const evaluation = useQuery(api.evaluations.getEvaluation, {
    id: id as Id<"evaluations">,
  });
  const calc = useCalculations(
    evaluation
      ? {
          roleType: evaluation.roleType,
          skillRatings: evaluation.skillRatings as Record<string, number | null>,
          valueRatings: evaluation.valueRatings as Record<string, number | null>,
          operationalMetrics: evaluation.operationalMetrics as Record<string, number | string | null>,
          authorityLevel: evaluation.authorityLevel,
        }
      : null
  );

  if (evaluation === undefined) {
    return (
      <div className="container" style={{ textAlign: "center", paddingTop: 64 }}>
        <p style={{ color: "var(--ink-soft)" }}>Loading evaluation...</p>
      </div>
    );
  }

  if (evaluation === null) {
    return (
      <div className="container" style={{ textAlign: "center", paddingTop: 64 }}>
        <p style={{ color: "var(--danger)" }}>Evaluation not found.</p>
      </div>
    );
  }

  const ratingLabel = (r: number | null): string => {
    if (r === null) return "\u2014";
    const labels: Record<number, string> = {
      1: "1 - Does Not Meet",
      2: "2 - Needs Development",
      3: "3 - Meets Expectations",
      4: "4 - Exceeds",
      5: "5 - Exceptional",
    };
    return labels[r] ?? String(r);
  };

  return (
    <div className="container">
      {/* Print Button */}
      <div className="no-print" style={{ marginBottom: 16, display: "flex", gap: 12 }}>
        <button className="btn btn-primary" onClick={() => window.print()}>
          Print Evaluation
        </button>
        <button className="btn btn-secondary" onClick={() => window.history.back()}>
          Back
        </button>
      </div>

      {/* Header */}
      <div className="form-header" style={{ borderRadius: "var(--radius)" }}>
        <div className="header-row">
          <div>
            <h1>{calc?.config.title ?? "Evaluation"}</h1>
            <p className="subtitle">{calc?.config.subtitle ?? "Performance Evaluation"}</p>
          </div>
          <Image src="/scopos-icon.png" alt="SCOPOS" width={52} height={52} className="logo" />
        </div>
      </div>

      {/* Employee Information */}
      <div className="card" style={{ marginTop: 16 }}>
        <div className="card-body">
          <h2 style={{ fontFamily: "var(--font-fraunces), 'Fraunces', serif", fontSize: 18, marginBottom: 16 }}>
            Employee Information
          </h2>
          <div className="info-grid">
            <div>
              <span style={{ fontWeight: 600, fontSize: 13, color: "var(--ink-soft)" }}>Employee Name</span>
              <p>{evaluation.empName || "\u2014"}</p>
            </div>
            <div>
              <span style={{ fontWeight: 600, fontSize: 13, color: "var(--ink-soft)" }}>Position</span>
              <p>{evaluation.empPosition || "\u2014"}</p>
            </div>
            <div>
              <span style={{ fontWeight: 600, fontSize: 13, color: "var(--ink-soft)" }}>Reviewer</span>
              <p>{evaluation.reviewer || "\u2014"}</p>
            </div>
            <div>
              <span style={{ fontWeight: 600, fontSize: 13, color: "var(--ink-soft)" }}>Review Date</span>
              <p>{evaluation.reviewDate || "\u2014"}</p>
            </div>
            <div>
              <span style={{ fontWeight: 600, fontSize: 13, color: "var(--ink-soft)" }}>Review Period</span>
              <p>{evaluation.reviewPeriod || "\u2014"}</p>
            </div>
            <div>
              <span style={{ fontWeight: 600, fontSize: 13, color: "var(--ink-soft)" }}>Project</span>
              <p>{evaluation.empProject || "\u2014"}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Skill Ratings */}
      {calc && (
        <div className="card" style={{ marginTop: 16 }}>
          <div className="card-body">
            <h2 style={{ fontFamily: "var(--font-fraunces), 'Fraunces', serif", fontSize: 18, marginBottom: 16 }}>
              Role Competencies
            </h2>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "2px solid var(--border-light)" }}>
                  <th style={{ padding: "8px 12px", textAlign: "left", fontSize: 13, fontWeight: 600, color: "var(--ink-soft)" }}>
                    Competency
                  </th>
                  <th style={{ padding: "8px 12px", textAlign: "center", fontSize: 13, fontWeight: 600, color: "var(--ink-soft)" }}>
                    Weight
                  </th>
                  <th style={{ padding: "8px 12px", textAlign: "left", fontSize: 13, fontWeight: 600, color: "var(--ink-soft)" }}>
                    Rating
                  </th>
                </tr>
              </thead>
              <tbody>
                {calc.skillRatings.map((s) => (
                  <tr key={s.id} style={{ borderBottom: "1px solid var(--border-light)" }}>
                    <td style={{ padding: "8px 12px", fontWeight: 500 }}>{s.name}</td>
                    <td style={{ padding: "8px 12px", textAlign: "center", color: "var(--ink-soft)" }}>
                      {(s.weight * 100).toFixed(0)}%
                    </td>
                    <td style={{ padding: "8px 12px" }}>{ratingLabel(s.rating)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div style={{ marginTop: 12, display: "flex", gap: 24 }}>
              <span style={{ fontWeight: 600 }}>
                Weighted Score: {calc.skillScore.display}
              </span>
              {calc.skillFlags.map((f, i) => (
                <span key={i} className={`flag flag-${f.type}`}>{f.text}</span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Value Ratings */}
      {calc && (
        <div className="card" style={{ marginTop: 16 }}>
          <div className="card-body">
            <h2 style={{ fontFamily: "var(--font-fraunces), 'Fraunces', serif", fontSize: 18, marginBottom: 16 }}>
              Core Values
            </h2>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "2px solid var(--border-light)" }}>
                  <th style={{ padding: "8px 12px", textAlign: "left", fontSize: 13, fontWeight: 600, color: "var(--ink-soft)" }}>
                    Value
                  </th>
                  <th style={{ padding: "8px 12px", textAlign: "left", fontSize: 13, fontWeight: 600, color: "var(--ink-soft)" }}>
                    Category
                  </th>
                  <th style={{ padding: "8px 12px", textAlign: "left", fontSize: 13, fontWeight: 600, color: "var(--ink-soft)" }}>
                    Rating
                  </th>
                </tr>
              </thead>
              <tbody>
                {calc.valueRatings.map((v) => (
                  <tr key={v.id} style={{ borderBottom: "1px solid var(--border-light)" }}>
                    <td style={{ padding: "8px 12px", fontWeight: 500 }}>{v.name}</td>
                    <td style={{ padding: "8px 12px", color: "var(--ink-soft)" }}>{v.category}</td>
                    <td style={{ padding: "8px 12px" }}>{ratingLabel(v.rating)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div style={{ marginTop: 12, display: "flex", gap: 24 }}>
              <span style={{ fontWeight: 600 }}>
                Average Value Score: {calc.valueScore.display}
              </span>
              {calc.valueFlags.map((f, i) => (
                <span key={i} className={`flag flag-${f.type}`}>{f.text}</span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Composite Score */}
      {calc && (
        <div className="card" style={{ marginTop: 16 }}>
          <div className="card-body">
            <h2 style={{ fontFamily: "var(--font-fraunces), 'Fraunces', serif", fontSize: 18, marginBottom: 16 }}>
              Composite Score
            </h2>
            <div style={{ fontSize: 28, fontWeight: 700, marginBottom: 8 }}>{calc.composite.display}</div>
            <p style={{ color: "var(--ink-soft)", fontSize: 13 }}>
              Weighted: 70% Skills ({calc.skillScore.display}) + 30% Values ({calc.valueScore.display})
            </p>
          </div>
        </div>
      )}

      {/* Authority Flags */}
      {calc && calc.authorityFlags.length > 0 && (
        <div className="card" style={{ marginTop: 16 }}>
          <div className="card-body">
            <h2 style={{ fontFamily: "var(--font-fraunces), 'Fraunces', serif", fontSize: 18, marginBottom: 16 }}>
              Authority Gates
            </h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {calc.authorityFlags.map((f, i) => (
                <span key={i} className={`flag flag-${f.type}`}>{f.text}</span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Promotion Readiness */}
      {calc && (
        <div className="card" style={{ marginTop: 16 }}>
          <div className="card-body">
            <h2 style={{ fontFamily: "var(--font-fraunces), 'Fraunces', serif", fontSize: 18, marginBottom: 16 }}>
              Promotion Readiness
            </h2>
            <div style={{ marginBottom: 12 }}>
              <span className={`flag flag-${calc.promotion.statusColor}`}>{calc.promotion.statusText}</span>
            </div>
            {calc.promotion.tiers.map((tier) => (
              <div key={tier.name} style={{ marginBottom: 16 }}>
                <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 8 }}>{tier.name}</h3>
                <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                  {tier.criteria.map((c, i) => (
                    <li key={i} style={{ padding: "4px 0", display: "flex", gap: 8, alignItems: "center" }}>
                      <span style={{ fontWeight: 600, color: c.met === true ? "var(--success)" : c.met === false ? "var(--danger)" : "var(--ink-soft)" }}>
                        {c.met === true ? "\u2713" : c.met === false ? "\u2717" : "\u2014"}
                      </span>
                      <span>{c.text}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Executive Summary */}
      {calc && calc.executive.length > 0 && (
        <div className="card" style={{ marginTop: 16 }}>
          <div className="card-body">
            <h2 style={{ fontFamily: "var(--font-fraunces), 'Fraunces', serif", fontSize: 18, marginBottom: 16 }}>
              Executive Summary
            </h2>
            <div className="info-grid">
              {calc.executive.map((m) => (
                <div key={m.label} className={m.className} style={{ padding: 16, borderRadius: "var(--radius)", textAlign: "center" }}>
                  <div style={{ fontSize: 22, fontWeight: 700 }}>{m.value}</div>
                  <div style={{ fontSize: 13, color: "var(--ink-soft)" }}>{m.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Deficiency Plan */}
      {calc && calc.deficiency.triggered && (
        <div className="card" style={{ marginTop: 16 }}>
          <div className="card-body">
            <h2 style={{ fontFamily: "var(--font-fraunces), 'Fraunces', serif", fontSize: 18, marginBottom: 16, color: "var(--danger)" }}>
              Deficiency Correction Required
            </h2>
            <ul style={{ margin: 0, paddingLeft: 20 }}>
              {calc.deficiency.gaps.map((g, i) => (
                <li key={i} style={{ padding: "4px 0" }}>{g}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Inflation Warning */}
      {calc && calc.inflationWarning && (
        <div className="card" style={{ marginTop: 16, borderLeft: "4px solid var(--warning)" }}>
          <div className="card-body">
            <h2 style={{ fontFamily: "var(--font-fraunces), 'Fraunces', serif", fontSize: 18, marginBottom: 8, color: "var(--warning)" }}>
              Inflation Warning
            </h2>
            <p style={{ color: "var(--ink-soft)" }}>
              High skill rating conflicts with operational metric data. Review for potential rating inflation.
            </p>
          </div>
        </div>
      )}

      {/* Manager Notes */}
      {evaluation.managerNotes && (
        <div className="card" style={{ marginTop: 16 }}>
          <div className="card-body">
            <h2 style={{ fontFamily: "var(--font-fraunces), 'Fraunces', serif", fontSize: 18, marginBottom: 16 }}>
              Manager Notes
            </h2>
            <p style={{ whiteSpace: "pre-wrap", lineHeight: 1.7 }}>{evaluation.managerNotes}</p>
          </div>
        </div>
      )}

      {/* Footer */}
      <div style={{ marginTop: 32, paddingTop: 16, borderTop: "1px solid var(--border-light)", textAlign: "center" }}>
        <p style={{ color: "var(--ink-soft)", fontSize: 12 }}>
          SCOPOS Performance System &mdash; Status: {evaluation.status}
        </p>
      </div>
    </div>
  );
}
