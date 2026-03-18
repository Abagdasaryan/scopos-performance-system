"use client";

import { useState, useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useRouter } from "next/navigation";
import { ROLE_CONFIGS } from "@/lib/roleConfig";

export default function EmployeeListPage() {
  const router = useRouter();
  const employees = useQuery(api.employees.getAllEmployees, {
    includeInactive: true,
  });

  const [search, setSearch] = useState("");
  const [deptFilter, setDeptFilter] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [activeFilter, setActiveFilter] = useState<"" | "active" | "inactive">(
    ""
  );

  const departments = useMemo(() => {
    if (!employees) return [];
    const depts = new Set(
      employees.map((e) => e.department).filter(Boolean) as string[]
    );
    return Array.from(depts).sort();
  }, [employees]);

  const filtered = useMemo(() => {
    if (!employees) return [];
    return employees.filter((e) => {
      if (search) {
        const q = search.toLowerCase();
        if (
          !e.name?.toLowerCase().includes(q) &&
          !e.email?.toLowerCase().includes(q)
        )
          return false;
      }
      if (deptFilter && e.department !== deptFilter) return false;
      if (roleFilter && e.roleType !== roleFilter) return false;
      if (activeFilter === "active" && !e.isActive) return false;
      if (activeFilter === "inactive" && e.isActive) return false;
      return true;
    });
  }, [employees, search, deptFilter, roleFilter, activeFilter]);

  function getManagerName(managerId?: string | null): string {
    if (!managerId || !employees) return "\u2014";
    const mgr = employees.find((e) => e._id === managerId);
    return mgr?.name ?? "\u2014";
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
          Employees
        </h1>
        <button
          className="btn btn-primary"
          onClick={() => router.push("/admin/employees/new")}
        >
          Add Employee
        </button>
      </div>

      {/* Filters */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div
          className="card-body"
          style={{
            display: "flex",
            gap: 16,
            alignItems: "flex-end",
            flexWrap: "wrap",
          }}
        >
          <div style={{ flex: 1, minWidth: 180 }}>
            <label
              style={{
                fontSize: 12,
                color: "var(--ink-muted)",
                fontWeight: 600,
                display: "block",
                marginBottom: 4,
              }}
            >
              Search
            </label>
            <input
              className="metric-input"
              style={{ width: "100%", textAlign: "left" }}
              type="text"
              placeholder="Name or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div>
            <label
              style={{
                fontSize: 12,
                color: "var(--ink-muted)",
                fontWeight: 600,
                display: "block",
                marginBottom: 4,
              }}
            >
              Department
            </label>
            <select
              className="metric-input"
              value={deptFilter}
              onChange={(e) => setDeptFilter(e.target.value)}
            >
              <option value="">All Departments</option>
              {departments.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label
              style={{
                fontSize: 12,
                color: "var(--ink-muted)",
                fontWeight: 600,
                display: "block",
                marginBottom: 4,
              }}
            >
              Role
            </label>
            <select
              className="metric-input"
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
            >
              <option value="">All Roles</option>
              {Object.entries(ROLE_CONFIGS).map(([key, config]) => (
                <option key={key} value={key}>
                  {config.title}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label
              style={{
                fontSize: 12,
                color: "var(--ink-muted)",
                fontWeight: 600,
                display: "block",
                marginBottom: 4,
              }}
            >
              Status
            </label>
            <select
              className="metric-input"
              value={activeFilter}
              onChange={(e) =>
                setActiveFilter(e.target.value as "" | "active" | "inactive")
              }
            >
              <option value="">All</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="card">
        <div className="card-body" style={{ padding: 0 }}>
          {employees === undefined ? (
            <div
              style={{
                padding: 24,
                textAlign: "center",
                color: "var(--ink-muted)",
              }}
            >
              Loading...
            </div>
          ) : filtered.length === 0 ? (
            <div
              style={{
                padding: 24,
                textAlign: "center",
                color: "var(--ink-muted)",
              }}
            >
              No employees found.
            </div>
          ) : (
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Title</th>
                  <th>Department</th>
                  <th>Role</th>
                  <th>Manager</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((emp) => (
                  <tr
                    key={emp._id}
                    onClick={() =>
                      router.push(`/admin/employees/${emp._id}`)
                    }
                  >
                    <td style={{ fontWeight: 600 }}>{emp.name}</td>
                    <td>{emp.title || "\u2014"}</td>
                    <td>{emp.department || "\u2014"}</td>
                    <td>
                      {emp.roleType
                        ? ROLE_CONFIGS[emp.roleType]?.title ?? emp.roleType
                        : "\u2014"}
                    </td>
                    <td>{getManagerName(emp.managerId)}</td>
                    <td>
                      <span
                        className={`status-badge ${emp.isActive ? "active" : "inactive"}`}
                      >
                        {emp.isActive ? "Active" : "Inactive"}
                      </span>
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
