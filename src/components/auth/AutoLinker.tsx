"use client";

import { useEffect, useRef } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";

/**
 * Auto-links a Clerk user to their employee record on first login.
 * Runs silently — no UI. Place in the layout tree inside ConvexProviderWithClerk.
 */
export function AutoLinker() {
  const authStatus = useQuery(api.auth.getAuthStatus);
  const linkClerkUser = useMutation(api.auth.linkClerkUser);
  const linking = useRef(false);

  useEffect(() => {
    if (authStatus?.status === "needs_linking" && !linking.current) {
      linking.current = true;
      linkClerkUser()
        .then(() => {
          console.log("[AutoLinker] Account linked successfully");
        })
        .catch((err) => {
          console.error("[AutoLinker] Failed to link account:", err);
        })
        .finally(() => {
          linking.current = false;
        });
    }
  }, [authStatus, linkClerkUser]);

  return null;
}
