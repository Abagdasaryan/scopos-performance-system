"use client";

interface SectionHeaderProps {
  number: number;
  title: string;
  weight?: string;
  description?: string;
}

export default function SectionHeader({
  number,
  title,
  weight,
  description,
}: SectionHeaderProps) {
  return (
    <>
      <div className="section-header">
        <span className="section-num">Section {number}</span>
        <span className="section-title">{title}</span>
        {weight && <span className="section-weight">{weight}</span>}
      </div>
      {description && <p className="section-desc">{description}</p>}
    </>
  );
}
