"use client";

import type { ReactNode } from "react";

interface CardProps {
  children: ReactNode;
  className?: string;
}

export default function Card({ children, className }: CardProps) {
  return (
    <div className={`card${className ? ` ${className}` : ""}`}>
      {children}
    </div>
  );
}
