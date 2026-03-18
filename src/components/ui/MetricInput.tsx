"use client";

import type { MetricDef } from "@/lib/types";

interface MetricInputProps {
  metric: MetricDef;
  value: number | string | null;
  onChange: (value: number | string | null) => void;
}

export default function MetricInput({ metric, value, onChange }: MetricInputProps) {
  if (metric.type === "select") {
    return (
      <div className="metric-row">
        <span className="metric-label">{metric.label}</span>
        <select
          className="metric-input"
          value={value != null ? String(value) : ""}
          onChange={(e) => onChange(e.target.value || null)}
        >
          {metric.options?.map((opt) => (
            <option key={opt} value={opt}>
              {opt || "— Select —"}
            </option>
          ))}
        </select>
      </div>
    );
  }

  return (
    <div className="metric-row">
      <span className="metric-label">{metric.label}</span>
      <input
        type="number"
        className="metric-input"
        value={value != null ? String(value) : ""}
        min={metric.min}
        max={metric.max}
        placeholder={metric.placeholder}
        onChange={(e) => {
          const raw = e.target.value;
          if (raw === "") {
            onChange(null);
          } else {
            onChange(Number(raw));
          }
        }}
      />
    </div>
  );
}
