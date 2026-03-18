"use client";

import { useState, useMemo } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { useRouter } from "next/navigation";
import { ROLE_CONFIGS } from "@/lib/roleConfig";
import EmployeePicker from "@/components/ui/EmployeePicker";

export default function NewReviewCyclePage() {
  const router = useRouter();
  const employees = useQuery(api.employees.getAllEmployees, {});
  const createCycle = useMutation(api.reviewCycles.createReviewCycle);

  const [name, setName] = useState("");
  const [period, setPeriod] = useState("");
  const [startDate, setStartDate] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [createdBy, setCreatedBy] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const grouped = useMemo(() => {
    if (!employees) return {};
    const groups: Record<string, typeof employees> = {};
    for (const emp of employees) {
      const dept = emp.department || "Unassigned";
      if (!groups[dept]) groups[dept] = [];
      groups[dept].push(emp);
    }
    return groups;
  }, [employees]);

  const departments = Object.keys(grouped).sort();

  function toggleEmployee(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleDepartment(dept: string) {
    const deptEmps = grouped[dept] || [];
    const allSelected = deptEmps.every((e) => selectedIds.has(e._id));
    setSelectedIds((prev) => {
      const next = new Set(prev);
      for (const emp of deptEmps) {
        if (allSelected) next.delete(emp._id);
        else next.add(emp._id);
      }
      return next;
    });
  }

  function selectAll() {
    if (!employees) return;
    setSelectedIds(new Set(employees.map((e) => e._id)));
  }

  function deselectAll() {
    setSelectedIds(new Set());
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!name.trim()) {
      setError("Cycle name is required.");
      return;
    }
    if (selectedIds.size === 0) {
      setError("Select at least one employee.");
      return;
    }
    if (!createdBy) {
      setError("Select who is creating this cycle (Acting as).");
      return;
    }
    setSaving(true);
    try {
      const newId = await createCycle({
        name: name.trim(),
        period: period.trim() || "",
        startDate: startDate || "",
        dueDate: dueDate || "",
        selectedEmployeeIds: Array.from(selectedIds) as any,
        createdBy: createdBy as any,
      });
      router.push(`/admin/review-cycles/${newId}`);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to create cycle.";
      setError(message);
    } finally {
      setSaving(false);
    }
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
        New Review Cycle
      </h1>

      {error && (
        <div className="rule-box warn" style={{ margin: "0 0 20px" }}>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        {/* Acting As */}
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
              Acting As (Creator)
            </label>
            <EmployeePicker
              employees={employees ?? []}
              selected={createdBy}
              onSelect={setCreatedBy}
              placeholder="Select who is creating this cycle..."
            />
          </div>
        </div>

        {/* Cycle Details */}
        <div className="card">
          <div
            className="info-grid"
            style={{
              borderRadius: "var(--radius)",
              border: "1px solid var(--border-light)",
            }}
          >
            <div>
              <label>Cycle Name *</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Q1 2026 Review"
                required
              />
            </div>
            <div>
              <label>Period</label>
              <input
                type="text"
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
                placeholder="Q1 2026"
              />
            </div>
            <div>
              <label>Start Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div>
              <label>Due Date</label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Employee Selection */}
        <div className="card" style={{ marginTop: 20 }}>
          <div className="card-body" style={{ paddingBottom: 8 }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 12,
              }}
            >
              <h2
                style={{
                  fontFamily: "var(--font-fraunces), 'Fraunces', serif",
                  fontSize: 18,
                }}
              >
                Select Employees ({selectedIds.size})
              </h2>
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ padding: "6px 14px", fontSize: 12 }}
                  onClick={selectAll}
                >
                  Select All
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ padding: "6px 14px", fontSize: 12 }}
                  onClick={deselectAll}
                >
                  Deselect All
                </button>
              </div>
            </div>
          </div>

          <div className="checkbox-list">
            {employees === undefined ? (
              <p style={{ color: "var(--ink-muted)" }}>Loading...</p>
            ) : (
              departments.map((dept) => {
                const deptEmps = grouped[dept];
                const allChecked = deptEmps.every((e) =>
                  selectedIds.has(e._id)
                );
                return (
                  <div key={dept}>
                    <div
                      className="checkbox-group-header"
                      onClick={() => toggleDepartment(dept)}
                    >
                      <input
                        type="checkbox"
                        checked={allChecked}
                        onChange={() => toggleDepartment(dept)}
                        style={{ width: 16, height: 16, accentColor: "var(--accent)" }}
                      />
                      <span>
                        {dept} ({deptEmps.length})
                      </span>
                    </div>
                    {deptEmps.map((emp) => (
                      <div className="checkbox-item" key={emp._id}>
                        <input
                          type="checkbox"
                          checked={selectedIds.has(emp._id)}
                          onChange={() => toggleEmployee(emp._id)}
                        />
                        <span style={{ fontWeight: 500 }}>{emp.name}</span>
                        <span
                          style={{
                            color: "var(--ink-muted)",
                            fontSize: 12,
                          }}
                        >
                          {emp.title || ""}
                          {emp.roleType
                            ? ` · ${ROLE_CONFIGS[emp.roleType]?.title ?? emp.roleType}`
                            : ""}
                        </span>
                      </div>
                    ))}
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className="actions-bar">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => router.push("/admin/review-cycles")}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={saving}
          >
            {saving ? "Creating..." : "Create Review Cycle"}
          </button>
        </div>
      </form>
    </div>
  );
}
