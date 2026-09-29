import { describe, expect, it } from "vitest";
import { countVisit, dismissedRecently, isIosSafari, rememberDismissal, shouldOffer, SNOOZE_DAYS } from "./install-prompt-logic";

function store(): Storage {
  const m = new Map<string, string>();
  return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v) } as Storage;
}

describe("countVisit", () => {
  it("counts once per session", () => {
    const local = store();
    const first = store();
    expect(countVisit(local, first)).toBe(1);
    expect(countVisit(local, first)).toBe(1);
    expect(countVisit(local, store())).toBe(2);
  });

  it("treats broken storage as a first visit", () => {
    const broken = { getItem: () => { throw new Error("blocked"); }, setItem: () => { throw new Error("blocked"); } } as unknown as Storage;
    expect(countVisit(broken, broken)).toBe(1);
  });
});

describe("dismissal", () => {
  it("snoozes for 30 days", () => {
    const local = store();
    const now = Date.UTC(2026, 8, 30);
    expect(dismissedRecently(local, now)).toBe(false);
    rememberDismissal(local, now);
    expect(dismissedRecently(local, now + (SNOOZE_DAYS - 1) * 86_400_000)).toBe(true);
    expect(dismissedRecently(local, now + SNOOZE_DAYS * 86_400_000)).toBe(false);
  });
});

describe("shouldOffer", () => {
  const base = { visits: 2, dismissedRecently: false, standalone: false, kind: "prompt" as const };
  it("offers from the second visit", () => {
    expect(shouldOffer(base)).toBe(true);
    expect(shouldOffer({ ...base, visits: 1 })).toBe(false);
  });
  it("never when installed, dismissed or not installable", () => {
    expect(shouldOffer({ ...base, standalone: true })).toBe(false);
    expect(shouldOffer({ ...base, dismissedRecently: true })).toBe(false);
    expect(shouldOffer({ ...base, kind: null })).toBe(false);
    expect(shouldOffer({ ...base, kind: "ios" })).toBe(true);
  });
});

describe("isIosSafari", () => {
  it("spots Safari on iPhone and leaves out other browsers", () => {
    const safari = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1";
    const chrome = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/129.0 Mobile/15E148 Safari/604.1";
    const android = "Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Mobile Safari/537.36";
    expect(isIosSafari(safari, 5)).toBe(true);
    expect(isIosSafari(chrome, 5)).toBe(false);
    expect(isIosSafari(android, 5)).toBe(false);
  });
});
