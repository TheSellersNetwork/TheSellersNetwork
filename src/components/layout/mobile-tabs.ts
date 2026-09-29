/* Which tab of the phone navigation bar is current, and where the bar is left out. Pure, for unit tests. */

export type TabKey = "forum" | "pickups" | "new" | "notifications" | "you" | "signin" | "join";

/* Staff pages and the brand picker have their own layouts; onboarding is a focused flow. */
const HIDDEN = [/^\/admin(\/|$)/, /^\/brand(\/|$)/, /^\/onboarding(\/|$)/];

export function tabBarHidden(pathname: string): boolean {
  return HIDDEN.some((r) => r.test(pathname));
}

const under = (pathname: string, base: string) => pathname === base || pathname.startsWith(`${base}/`);

export function activeTab(pathname: string, username: string | null): TabKey | null {
  if (under(pathname, "/community/pickups")) return "pickups";
  if (under(pathname, "/community/new")) return "new";
  if (under(pathname, "/community/notifications")) return "notifications";
  if (username && (under(pathname, `/community/u/${username.toLowerCase()}`) || under(pathname, "/account"))) return "you";
  if (under(pathname, "/community")) return "forum";
  if (!username && under(pathname, "/login")) return "signin";
  if (!username && under(pathname, "/signup")) return "join";
  return null;
}
