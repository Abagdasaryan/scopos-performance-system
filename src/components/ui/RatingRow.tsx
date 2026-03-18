"use client";

import type { SkillDef, ValueDef } from "@/lib/types";

interface RatingRowProps {
  item: SkillDef | ValueDef;
  group: "skill" | "value";
  showWeight: boolean;
  selectedRating: number | null;
  onRate: (rating: number) => void;
}

export default function RatingRow({
  item,
  group,
  showWeight,
  selectedRating,
  onRate,
}: RatingRowProps) {
  const weightOrCategory = showWeight
    ? `${((item as SkillDef).weight * 100).toFixed(0)}%`
    : (item as ValueDef).category;

  return (
    <tr>
      <td>{item.name}</td>
      <td className="weight-cell">{weightOrCategory}</td>
      {[1, 2, 3, 4, 5].map((rating) => (
        <td key={rating}>
          <div className="radio-group">
            <input
              type="radio"
              id={`${group}-${item.id}-${rating}`}
              name={`${group}-${item.id}`}
              value={rating}
              checked={selectedRating === rating}
              onChange={() => onRate(rating)}
            />
            <label htmlFor={`${group}-${item.id}-${rating}`}>{rating}</label>
          </div>
        </td>
      ))}
    </tr>
  );
}
