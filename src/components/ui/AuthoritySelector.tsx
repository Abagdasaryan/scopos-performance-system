"use client";

import type { AuthorityLevel } from "@/lib/types";

interface AuthoritySelectorProps {
  levels: AuthorityLevel[];
  selected: string | undefined;
  onSelect: (value: string) => void;
}

export default function AuthoritySelector({
  levels,
  selected,
  onSelect,
}: AuthoritySelectorProps) {
  return (
    <div>
      {levels.map((level) => (
        <label key={level.value} className="authority-option">
          <input
            type="radio"
            name="authority-level"
            value={level.value}
            checked={selected === level.value}
            onChange={() => onSelect(level.value)}
          />
          <div className="radio-visual" />
          <span>{level.label}</span>
        </label>
      ))}
    </div>
  );
}
