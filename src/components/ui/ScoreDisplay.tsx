"use client";

interface ScoreDisplayProps {
  label: string;
  value: string;
  isEmpty: boolean;
}

export default function ScoreDisplay({ label, value, isEmpty }: ScoreDisplayProps) {
  return (
    <div className="score-row">
      <span className="score-label">{label}</span>
      <span className={`score-value${isEmpty ? " empty" : ""}`}>{value}</span>
    </div>
  );
}
