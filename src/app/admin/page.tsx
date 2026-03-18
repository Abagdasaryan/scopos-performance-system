"use client";

import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import Link from "next/link";

export default function AdminDashboard() {
  const employees = useQuery(api.employees.getAllEmployees, {});
  const activeCycles = useQuery(api.reviewCycles.listReviewCycles, {
    status: "active",
  });

  const employeeCount = employees?.length ?? 0;
  const cycleCount = activeCycles?.length ?? 0;

  return (
    <div className="container">
      <h1
        style={{
          fontFamily: "var(--font-fraunces), 'Fraunces', serif",
          fontSize: 24,
          marginBottom: 24,
        }}
      >
        Admin Dashboard
      </h1>

      <div className="stat-grid">
        <div className="stat-card">
          <div className="stat-value">{employeeCount}</div>
          <div className="stat-label">Active Employees</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{cycleCount}</div>
          <div className="stat-label">Active Review Cycles</div>
        </div>
        <div className="stat-card">
          <div className="stat-label" style={{ marginTop: 0 }}>Quick Links</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 8 }}>
            <Link href="/admin/employees" style={{ color: "var(--accent)", fontSize: 14 }}>
              Manage Employees
            </Link>
            <Link href="/admin/org-chart" style={{ color: "var(--accent)", fontSize: 14 }}>
              View Org Chart
            </Link>
            <Link href="/admin/review-cycles" style={{ color: "var(--accent)", fontSize: 14 }}>
              Review Cycles
            </Link>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-body">
          <h2
            style={{
              fontFamily: "var(--font-fraunces), 'Fraunces', serif",
              fontSize: 18,
              marginBottom: 16,
            }}
          >
            Quick Actions
          </h2>
          <div style={{ display: "flex", gap: 12 }}>
            <Link href="/admin/employees/new" className="btn btn-primary">
              Add Employee
            </Link>
            <Link href="/admin/review-cycles/new" className="btn btn-secondary">
              New Review Cycle
            </Link>
            <Link href="/admin/org-chart" className="btn btn-secondary">
              View Org Chart
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
