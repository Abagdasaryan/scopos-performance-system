import Link from "next/link";
import Image from "next/image";

export default function HomePage() {
  return (
    <div className="container">
      <div className="form-header" style={{ borderRadius: "var(--radius)" }}>
        <div className="header-row">
          <div>
            <h1>SCOPOS Performance System</h1>
            <p className="subtitle">Employee Evaluation & Review Platform</p>
          </div>
          <Image src="/scopos-icon.png" alt="SCOPOS" width={52} height={52} className="logo" />
        </div>
      </div>

      <div className="card" style={{ marginTop: 24 }}>
        <div className="card-body">
          <h2 style={{ fontFamily: "var(--font-fraunces), 'Fraunces', serif", fontSize: 22, marginBottom: 16 }}>
            Manager Guide
          </h2>
          <p style={{ color: "var(--ink-soft)", marginBottom: 24, lineHeight: 1.8 }}>
            This platform enables structured, data-driven employee evaluations across roles.
            Each evaluation measures role-specific competencies, core values, operational metrics,
            and generates automated insights for promotion readiness, authority gates, and risk flags.
          </p>

          <div style={{ display: "flex", gap: 12 }}>
            <Link href="/evaluations/new" className="btn btn-primary">
              New Evaluation
            </Link>
            <Link href="/evaluations" className="btn btn-secondary">
              View All Evaluations
            </Link>
          </div>
        </div>
      </div>

      {/* Quick overview cards */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginTop: 8 }}>
        <div className="card">
          <div className="card-body">
            <h3 style={{ fontFamily: "var(--font-fraunces), 'Fraunces', serif", fontSize: 17, marginBottom: 8 }}>
              Construction Administrator
            </h3>
            <p style={{ color: "var(--ink-soft)", fontSize: 14 }}>
              6 role competencies, technical authority gates, code & regulatory focus.
            </p>
          </div>
        </div>
        <div className="card">
          <div className="card-body">
            <h3 style={{ fontFamily: "var(--font-fraunces), 'Fraunces', serif", fontSize: 17, marginBottom: 8 }}>
              Interior Designer
            </h3>
            <p style={{ color: "var(--ink-soft)", fontSize: 14 }}>
              7 role competencies, client exposure tracking, documentation oversight.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
