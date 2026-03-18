"use client";

import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { ReactNode } from "react";
import type { AdminRole } from "@/lib/types";

export function RoleGate({
  allowed,
  children,
  fallbackUrl = "/",
}: {
  allowed: AdminRole[];
  children: ReactNode;
  fallbackUrl?: string;
}) {
  const router = useRouter();
  const authStatus = useQuery(api.auth.getAuthStatus);

  useEffect(() => {
    if (
      authStatus?.status === "authenticated" &&
      !allowed.includes(authStatus.employee.adminRole as AdminRole)
    ) {
      router.replace(fallbackUrl);
    }
  }, [authStatus, allowed, fallbackUrl, router]);

  if (!authStatus || authStatus.status !== "authenticated") {
    return (
      <div style={{ padding: 40, textAlign: "center", color: "var(--ink-muted)" }}>
        Loading...
      </div>
    );
  }

  if (!allowed.includes(authStatus.employee.adminRole as AdminRole)) {
    return null;
  }

  return <>{children}</>;
}
