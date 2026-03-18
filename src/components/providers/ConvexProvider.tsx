"use client";

import { ConvexProvider, ConvexReactClient } from "convex/react";
import { ReactNode, useMemo } from "react";

export function ConvexClientProvider({ children }: { children: ReactNode }) {
  const convex = useMemo(() => {
    const url = process.env.NEXT_PUBLIC_CONVEX_URL;
    if (!url) return null;
    return new ConvexReactClient(url);
  }, []);

  if (!convex) {
    return (
      <div style={{ padding: 40, textAlign: "center", color: "#c0392b" }}>
        <h2>Convex not configured</h2>
        <p>
          Run <code>npx convex dev</code> and set{" "}
          <code>NEXT_PUBLIC_CONVEX_URL</code> in <code>.env.local</code>
        </p>
      </div>
    );
  }

  return <ConvexProvider client={convex}>{children}</ConvexProvider>;
}
