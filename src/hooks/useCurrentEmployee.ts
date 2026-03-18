import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useEffect, useRef } from "react";

export function useCurrentEmployee() {
  const authStatus = useQuery(api.auth.getAuthStatus);
  const linkClerkUser = useMutation(api.auth.linkClerkUser);
  const hasLinked = useRef(false);

  useEffect(() => {
    if (authStatus?.status === "needs_linking" && !hasLinked.current) {
      hasLinked.current = true;
      linkClerkUser().catch(console.error);
    }
  }, [authStatus?.status, linkClerkUser]);

  return authStatus;
}
