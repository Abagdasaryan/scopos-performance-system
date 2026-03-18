"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";

export default function Navigation() {
  const [adminOpen, setAdminOpen] = useState(false);

  return (
    <nav className="top-nav no-print">
      <Link href="/">
        <Image
          src="/scopos-icon.png"
          alt="SCOPOS"
          width={32}
          height={32}
          className="nav-logo"
        />
      </Link>
      <Link href="/">Home</Link>
      <Link href="/evaluations">Evaluations</Link>
      <Link href="/my-team">My Team</Link>
      <div className="nav-spacer" />
      <div className="nav-dropdown">
        <button onClick={() => setAdminOpen(!adminOpen)}>
          Admin ▾
        </button>
        {adminOpen && (
          <div className="nav-dropdown-menu">
            <Link
              href="/admin/employees"
              onClick={() => setAdminOpen(false)}
            >
              Employees
            </Link>
            <Link
              href="/admin/org-chart"
              onClick={() => setAdminOpen(false)}
            >
              Org Chart
            </Link>
            <Link
              href="/admin/review-cycles"
              onClick={() => setAdminOpen(false)}
            >
              Review Cycles
            </Link>
          </div>
        )}
      </div>
    </nav>
  );
}
