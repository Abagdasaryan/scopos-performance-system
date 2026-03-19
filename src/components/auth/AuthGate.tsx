"use client";

import { useCurrentEmployee } from "@/hooks/useCurrentEmployee";
import { SignOutButton } from "@clerk/nextjs";
import { usePathname } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { ReactNode } from "react";

export function AuthGate({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const authStatus = useCurrentEmployee();

  // Don't gate the sign-in page
  if (pathname?.startsWith("/sign-in")) {
    return <>{children}</>;
  }

  if (!authStatus || authStatus.status === "needs_linking") {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh" }}>
        <p style={{ color: "var(--ink-muted)" }}>Loading...</p>
      </div>
    );
  }

  if (authStatus.status === "not_activated") {
    return <NotActivatedScreen />;
  }

  if (authStatus.status === "unauthenticated") {
    return <>{children}</>;
  }

  return <>{children}</>;
}

function NotActivatedScreen() {
  const debug = useQuery(api.migrations.debugAuth);
  return (
    <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", minHeight: "100vh", gap: 16 }}>
      <h2 style={{ fontFamily: "var(--font-fraunces), 'Fraunces', serif" }}>Account Not Activated</h2>
      <p style={{ color: "var(--ink-muted)", maxWidth: 400, textAlign: "center" }}>
        Your account has not been set up yet. Please contact your administrator to get access.
      </p>
      {debug && (
        <pre style={{ background: "#f3f4f6", padding: 16, borderRadius: 8, fontSize: 12, maxWidth: 500, overflow: "auto" }}>
          {JSON.stringify(debug, null, 2)}
        </pre>
      )}
      <SignOutButton>
        <button className="btn btn-secondary">Sign Out</button>
      </SignOutButton>
    </div>
  );
}
