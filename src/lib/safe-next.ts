/*
  Where to send someone after signing in. Only paths on this site are
  allowed: "//evil.test" and "/\evil.test" look like paths but browsers treat
  them as other sites, so they are refused.
*/
export function safeNext(next: unknown, fallback = "/community"): string {
  if (typeof next !== "string" || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return fallback;
  try {
    const url = new URL(next, "https://placeholder.invalid");
    if (url.origin !== "https://placeholder.invalid") return fallback;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return fallback;
  }
}
