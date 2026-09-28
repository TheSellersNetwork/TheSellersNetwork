/*
  Analytics consent (PECR). Stored in a first-party cookie so both the browser
  and the server can read it. Nothing non-essential runs until it says
  "analytics". Changing it fires an event so the provider can react.
*/
export const CONSENT_COOKIE = "tsn-consent";
export const CONSENT_EVENT = "tsn:consent";
export const OPEN_SETTINGS_EVENT = "tsn:cookie-settings";
export type Consent = "analytics" | "essential";

export function readConsent(): Consent | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(/(?:^|;\s*)tsn-consent=(analytics|essential)/);
  return (match?.[1] as Consent | undefined) ?? null;
}

export function writeConsent(value: Consent) {
  // Six months, then we ask again, as the ICO suggests revisiting consent.
  document.cookie = `${CONSENT_COOKIE}=${value}; Path=/; Max-Age=${60 * 60 * 24 * 182}; SameSite=Lax; Secure`;
  window.dispatchEvent(new CustomEvent(CONSENT_EVENT, { detail: value }));
}
