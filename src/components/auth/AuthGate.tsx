"use client";

import { useCurrentEmployee } from "@/hooks/useCurrentEmployee";
import { SignOutButton } from "@clerk/nextjs";
import { ReactNode } from "react";

export function AuthGate({ children }: { children: ReactNode }) {
  const authStatus = useCurrentEmployee();

  if (!authStatus || authStatus.status === "needs_linking") {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh" }}>
        <p style={{ color: "var(--ink-muted)" }}>Loading...</p>
      </div>
    );
  }

  if (authStatus.status === "not_activated") {
    return (
      <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", minHeight: "100vh", gap: 16 }}>
        <h2 style={{ fontFamily: "var(--font-fraunces), 'Fraunces', serif" }}>Account Not Activated</h2>
        <p style={{ color: "var(--ink-muted)", maxWidth: 400, textAlign: "center" }}>
          Your account has not been set up yet. Please contact your administrator to get access.
        </p>
        <SignOutButton>
          <button className="btn btn-secondary">Sign Out</button>
        </SignOutButton>
      </div>
    );
  }

  if (authStatus.status === "unauthenticated") {
    return null;
  }

  return <>{children}</>;
}
