/*
  When to offer "Add to home screen". Pure, for unit tests; the component
  (install-prompt.tsx) supplies storage and the browser's answers.

  - Never on a first visit: a visit is counted once per browser session.
  - Never within 30 days of the member dismissing it.
  - Never when the site is already running as an installed app.
  - Only where installing is possible: Chrome, Edge and Android fire
    beforeinstallprompt; iOS Safari gets written instructions instead.
*/

export const VISITS_KEY = "tsn-install-visits";
export const DISMISSED_KEY = "tsn-install-dismissed";
export const SESSION_KEY = "tsn-install-visit-counted";
export const SNOOZE_DAYS = 30;

type Store = Pick<Storage, "getItem" | "setItem">;

/* Counts this visit once per session and returns the total so far. Storage that throws (private mode) counts as a first visit. */
export function countVisit(local: Store, session: Store): number {
  try {
    const current = Number(local.getItem(VISITS_KEY)) || 0;
    if (session.getItem(SESSION_KEY)) return current;
    session.setItem(SESSION_KEY, "1");
    const next = current + 1;
    local.setItem(VISITS_KEY, String(next));
    return next;
  } catch {
    return 1;
  }
}

export function dismissedRecently(local: Store, now: number): boolean {
  try {
    const at = Number(local.getItem(DISMISSED_KEY));
    return !!at && now - at < SNOOZE_DAYS * 86_400_000;
  } catch {
    return false;
  }
}

export function rememberDismissal(local: Store, now: number): void {
  try {
    local.setItem(DISMISSED_KEY, String(now));
  } catch {
    // Nowhere to remember it; it will not show again this session anyway.
  }
}

export type InstallKind = "prompt" | "ios" | null;

/* iOS Safari only: other iOS browsers and in-app browsers cannot add to the home screen the same way. */
export function isIosSafari(userAgent: string, maxTouchPoints: number): boolean {
  const ios = /iphone|ipad|ipod/i.test(userAgent) || (userAgent.includes("Macintosh") && maxTouchPoints > 1);
  return ios && /safari/i.test(userAgent) && !/crios|fxios|edgios|opios|gsa\/|fban|fbav|instagram/i.test(userAgent);
}

export function shouldOffer(args: { visits: number; dismissedRecently: boolean; standalone: boolean; kind: InstallKind }): boolean {
  return args.kind !== null && !args.standalone && !args.dismissedRecently && args.visits >= 2;
}
