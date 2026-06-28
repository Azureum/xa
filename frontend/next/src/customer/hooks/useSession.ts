import { useMemo } from "react";

import { getOrCreateSessionToken } from "../lib/session";

export function useSession(businessSlug: string, locationSlug: string): string {
  return useMemo(
    () => getOrCreateSessionToken(businessSlug, locationSlug),
    [businessSlug, locationSlug],
  );
}
