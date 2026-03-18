"use client";

import { useState } from "react";
import Link from "next/link";

interface Employee {
  _id: string;
  name: string;
  title?: string;
  department?: string;
  isActive: boolean;
  managerId?: string | null;
}

interface OrgTreeNodeProps {
  employee: Employee;
  allEmployees: Employee[];
  level: number;
}

function deptBadgeClass(dept?: string): string {
  if (!dept) return "dept-badge default";
  const d = dept.toLowerCase();
  if (d.includes("design")) return "dept-badge design";
  if (d.includes("construction")) return "dept-badge construction";
  if (d.includes("operations")) return "dept-badge operations";
  return "dept-badge default";
}

export default function OrgTreeNode({
  employee,
  allEmployees,
  level,
}: OrgTreeNodeProps) {
  const children = allEmployees.filter(
    (e) => e.managerId === employee._id && e.isActive
  );
  const [expanded, setExpanded] = useState(level < 2);

  return (
    <div className="org-connector">
      <div className="org-node">
        <div className="org-name">{employee.name}</div>
        <div className="org-title">{employee.title || "No title"}</div>
        {employee.department && (
          <span className={deptBadgeClass(employee.department)}>
            {employee.department}
          </span>
        )}
        {children.length > 0 && (
          <div className="org-reports">
            {children.length} direct report{children.length !== 1 ? "s" : ""}
          </div>
        )}
        <Link
          href={`/admin/employees/${employee._id}`}
          style={{
            fontSize: 11,
            color: "var(--accent)",
            display: "block",
            marginTop: 4,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          Edit
        </Link>
        {children.length > 0 && (
          <button
            className="org-expand-btn"
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? "−" : "+"}
          </button>
        )}
      </div>
      {expanded && children.length > 0 && (
        <div className="org-children">
          {children.map((child) => (
            <OrgTreeNode
              key={child._id}
              employee={child}
              allEmployees={allEmployees}
              level={level + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}
