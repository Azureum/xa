function storageKey(businessSlug: string, locationSlug: string): string {
  return `ai-host:session:${businessSlug}:${locationSlug}`;
}

export function getOrCreateSessionToken(businessSlug: string, locationSlug: string): string {
  const key = storageKey(businessSlug, locationSlug);
  const existing = localStorage.getItem(key);
  if (existing) {
    return existing;
  }

  const token = crypto.randomUUID();
  localStorage.setItem(key, token);
  return token;
}
