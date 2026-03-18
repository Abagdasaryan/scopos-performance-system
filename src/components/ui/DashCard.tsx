"use client";

interface DashCardProps {
  card: {
    id: string;
    label: string;
    value: string;
    detail?: string;
    className: string;
  };
}

export default function DashCard({ card }: DashCardProps) {
  return (
    <div className={card.className}>
      <div className="dash-label">{card.label}</div>
      <div className="dash-value">{card.value}</div>
      {card.detail && <div className="dash-detail">{card.detail}</div>}
    </div>
  );
}
