"use client";

import { useState, useEffect } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { useRouter, useParams } from "next/navigation";
import { ROLE_CONFIGS } from "@/lib/roleConfig";
import EmployeePicker from "@/components/ui/EmployeePicker";
import type { Id } from "../../../../../convex/_generated/dataModel";

export default function EditEmployeePage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const employee = useQuery(api.employees.getEmployee, {
    id: id as Id<"employees">,
  });
  const allEmployees = useQuery(api.employees.getAllEmployees, {});
  const updateEmployee = useMutation(api.employees.updateEmployee);
  const deactivateEmployee = useMutation(api.employees.deactivateEmployee);

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
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (employee && !loaded) {
      setName(employee.name ?? "");
      setEmail(employee.email ?? "");
      setTitle(employee.title ?? "");
      setDepartment(employee.department ?? "");
      setRoleType(employee.roleType ?? "");
      setManagerId(employee.managerId ?? null);
      setAdminRole(employee.adminRole ?? "employee");
      setHireDate(employee.hireDate ?? "");
      setLoaded(true);
    }
  }, [employee, loaded]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      await updateEmployee({
        id: id as Id<"employees">,
        name: name.trim(),
        email: email.trim(),
        title: title.trim() || undefined,
        department: department.trim() || undefined,
        roleType: roleType || undefined,
        managerId: (managerId || undefined) as Id<"employees"> | undefined,
        adminRole: adminRole as "employee" | "manager" | "hr_admin" | "super_admin",
        hireDate: hireDate || undefined,
      });
      router.push("/admin/employees");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to update employee.";
      setError(message);
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleActive() {
    setError("");
    try {
      if (employee?.isActive) {
        await deactivateEmployee({ id: id as Id<"employees"> });
      } else {
        await updateEmployee({ id: id as Id<"employees">, isActive: true });
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Operation failed.";
      setError(message);
    }
  }

  if (employee === undefined) {
    return (
      <div className="container">
        <p style={{ color: "var(--ink-muted)" }}>Loading...</p>
      </div>
    );
  }
  if (employee === null) {
    return (
      <div className="container">
        <p style={{ color: "var(--danger)" }}>Employee not found.</p>
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
          Edit Employee
        </h1>
        <span
          className={`status-badge ${employee.isActive ? "active" : "inactive"}`}
        >
          {employee.isActive ? "Active" : "Inactive"}
        </span>
      </div>

      {error && (
        <div className="rule-box warn" style={{ margin: "0 0 20px" }}>
          {error}
        </div>
      )}

      <form onSubmit={handleSave}>
        <div className="card">
          <div className="info-grid" style={{ borderRadius: "var(--radius)", border: "1px solid var(--border-light)" }}>
            <div>
              <label>Name *</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div>
              <label>Email *</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div>
              <label>Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
            <div>
              <label>Department</label>
              <input
                type="text"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
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
                employees={(allEmployees ?? []).filter((e) => e._id !== id)}
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
            onClick={handleToggleActive}
            style={
              employee.isActive
                ? { color: "var(--danger)", borderColor: "var(--danger)" }
                : { color: "var(--success)", borderColor: "var(--success)" }
            }
          >
            {employee.isActive ? "Deactivate" : "Activate"}
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => router.push("/admin/employees")}
          >
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </form>
    </div>
  );
}
