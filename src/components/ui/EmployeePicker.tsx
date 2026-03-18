"use client";

import { useState, useRef, useEffect } from "react";

interface Employee {
  _id: string;
  name: string;
  email?: string;
  title?: string;
  department?: string;
}

interface EmployeePickerProps {
  employees: Employee[];
  selected: string | null;
  onSelect: (id: string | null) => void;
  placeholder?: string;
}

export default function EmployeePicker({
  employees,
  selected,
  onSelect,
  placeholder = "Search employees...",
}: EmployeePickerProps) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const selectedEmployee = selected
    ? employees.find((e) => e._id === selected)
    : null;

  const filtered = query.trim()
    ? employees.filter((e) => {
        const q = query.toLowerCase();
        return (
          e.name?.toLowerCase().includes(q) ||
          e.email?.toLowerCase().includes(q)
        );
      })
    : employees;

  if (selectedEmployee) {
    return (
      <div className="employee-picker" ref={ref}>
        <div className="employee-picker-selected">
          <span>{selectedEmployee.name}</span>
          {selectedEmployee.title && (
            <span style={{ color: "var(--ink-muted)", fontSize: 12 }}>
              — {selectedEmployee.title}
            </span>
          )}
          <button
            className="clear-btn"
            onClick={() => {
              onSelect(null);
              setQuery("");
            }}
            type="button"
          >
            ×
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="employee-picker" ref={ref}>
      <input
        className="metric-input employee-picker-input"
        type="text"
        placeholder={placeholder}
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
      />
      {open && filtered.length > 0 && (
        <div className="employee-picker-dropdown">
          {filtered.slice(0, 20).map((emp) => (
            <div
              key={emp._id}
              className="employee-picker-item"
              onClick={() => {
                onSelect(emp._id);
                setQuery("");
                setOpen(false);
              }}
            >
              <div className="emp-name">{emp.name}</div>
              <div className="emp-detail">
                {emp.title}
                {emp.department ? ` · ${emp.department}` : ""}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
