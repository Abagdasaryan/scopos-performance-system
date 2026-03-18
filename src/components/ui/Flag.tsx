"use client";

interface FlagProps {
  text: string;
  type: "danger" | "warn" | "success";
}

export default function Flag({ text, type }: FlagProps) {
  return (
    <span className={`flag ${type}`}>
      <span className="dot" />
      {text}
    </span>
  );
}
