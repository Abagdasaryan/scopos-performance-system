"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { useRouter } from "next/navigation";
import { ROLE_CONFIGS } from "@/lib/roleConfig";
import EmployeePicker from "@/components/ui/EmployeePicker";

export default function NewEmployeePage() {
  const router = useRouter();
  const employees = useQuery(api.employees.getAllEmployees, {});
  const createEmployee = useMutation(api.employees.createEmployee);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [title, setTitle] = useState("");
  const [department, setDepartment] = useState("");
  const [roleType, setRoleType] = useState("");
  const [managerId, setManagerId] = useState<string | null>(null);
  const [adminRole, setAdminRole] = useState("employee");
  const [hireDate, setHireDate] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!name.trim() || !email.trim()) {
      setError("Name and email are required.");
      return;
    }
    setSaving(true);
    try {
      await createEmployee({
        name: name.trim(),
        email: email.trim(),
        title: title.trim() || "",
        department: department.trim() || undefined,
        roleType: roleType || undefined,
        managerId: (managerId || undefined) as any,
        adminRole: adminRole,
        hireDate: hireDate || undefined,
      });
      router.push("/admin/employees");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to create employee.";
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
        Add Employee
      </h1>

      {error && (
        <div
          className="rule-box warn"
          style={{ margin: "0 0 20px" }}
        >
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="card">
          <div className="info-grid" style={{ borderRadius: "var(--radius)", border: "1px solid var(--border-light)" }}>
            <div>
              <label>Name *</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Full name"
                required
              />
            </div>
            <div>
              <label>Email *</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="email@scopos.com"
                required
              />
            </div>
            <div>
              <label>Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Job title"
              />
            </div>
            <div>
              <label>Department</label>
              <input
                type="text"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                placeholder="Department"
              />
            </div>
            <div>
              <label>Role Type</label>
              <select
                className="metric-input"
                style={{ width: "100%", textAlign: "left" }}
                value={roleType}
                onChange={(e) => setRoleType(e.target.value)}
              >
                <option value="">-- Select Role --</option>
                {Object.entries(ROLE_CONFIGS).map(([key, config]) => (
                  <option key={key} value={key}>
                    {config.title}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label>Manager</label>
              <EmployeePicker
                employees={employees ?? []}
                selected={managerId}
                onSelect={setManagerId}
                placeholder="Select manager..."
              />
            </div>
            <div>
              <label>Admin Role</label>
              <select
                className="metric-input"
                style={{ width: "100%", textAlign: "left" }}
                value={adminRole}
                onChange={(e) => setAdminRole(e.target.value)}
              >
                <option value="employee">Employee</option>
                <option value="manager">Manager</option>
                <option value="hr_admin">HR Admin</option>
                <option value="super_admin">Super Admin</option>
              </select>
            </div>
            <div>
              <label>Hire Date</label>
              <input
                type="date"
                value={hireDate}
                onChange={(e) => setHireDate(e.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="actions-bar">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => router.push("/admin/employees")}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={saving}
          >
            {saving ? "Creating..." : "Create Employee"}
          </button>
        </div>
      </form>
    </div>
  );
}
