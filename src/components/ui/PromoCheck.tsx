"use client";

interface PromoCheckProps {
  text: string;
  met: boolean | null;
}

export default function PromoCheck({ text, met }: PromoCheckProps) {
  const statusClass = met === null ? "unmet" : met ? "met" : "fail";
  const icon = met === null ? "\u2014" : met ? "\u2713" : "\u2717";
  const textClass = met === null ? "" : met ? " met-text" : " fail-text";

  return (
    <div className="promo-check">
      <span className={`promo-status ${statusClass}`}>{icon}</span>
      <span className={`criteria-text${textClass}`}>{text}</span>
    </div>
  );
}
