"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { UserButton } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";

export default function Navigation() {
  const [adminOpen, setAdminOpen] = useState(false);
  const authStatus = useQuery(api.auth.getAuthStatus);

  useEffect(() => {
    if (!adminOpen) return;
    const handleClick = () => setAdminOpen(false);
    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, [adminOpen]);

  const role = authStatus?.status === "authenticated"
    ? authStatus.employee.adminRole
    : null;

  const isAdmin = role === "super_admin" || role === "hr_admin";
  const isManagerOrAbove = isAdmin || role === "manager";

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
      {isManagerOrAbove && <Link href="/my-team">My Team</Link>}
      <div className="nav-spacer" />
      {isAdmin && (
        <div className="nav-dropdown">
          <button onClick={(e) => { e.stopPropagation(); setAdminOpen(!adminOpen); }}>
            Admin ▾
          </button>
          {adminOpen && (
            <div className="nav-dropdown-menu">
              <Link href="/admin/employees" onClick={() => setAdminOpen(false)}>
                Employees
              </Link>
              <Link href="/admin/org-chart" onClick={() => setAdminOpen(false)}>
                Org Chart
              </Link>
              <Link href="/admin/review-cycles" onClick={() => setAdminOpen(false)}>
                Review Cycles
              </Link>
            </div>
          )}
        </div>
      )}
      <UserButton />
    </nav>
  );
}
