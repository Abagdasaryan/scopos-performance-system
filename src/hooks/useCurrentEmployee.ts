import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useEffect, useRef, useState } from "react";

export function useCurrentEmployee() {
  const authStatus = useQuery(api.auth.getAuthStatus);
  const linkClerkUser = useMutation(api.auth.linkClerkUser);
  const hasLinked = useRef(false);
  const [linkError, setLinkError] = useState<string | null>(null);

  useEffect(() => {
    if (authStatus?.status === "needs_linking" && !hasLinked.current) {
      hasLinked.current = true;
      linkClerkUser()
        .then(() => setLinkError(null))
        .catch((err) => {
          console.error("Failed to link account:", err);
          setLinkError(err instanceof Error ? err.message : "Failed to link account");
        });
    }
  }, [authStatus?.status, linkClerkUser]);

  // If linking failed, surface the error
  if (linkError && authStatus?.status === "needs_linking") {
    return { status: "error" as const, error: linkError };
  }

  return authStatus;
}
