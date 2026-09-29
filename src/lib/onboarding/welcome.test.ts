import { describe, expect, test } from "vitest";
import { showWelcome, welcomeSteps, type WelcomeFacts } from "@/lib/onboarding/welcome";

const links = { account: "/account", introduce: "/community/new?category=introductions", pickup: "/community/pickups/new", answer: "/community?view=unanswered", follow: "/community" };
const none: WelcomeFacts = { hasAvatarOrBio: false, platformCount: 0, introduced: false, pickups: 0, answers: 0, follows: 0 };

describe("welcome checklist", () => {
  test("steps come from real facts", () => {
    expect(welcomeSteps(none, links).filter((s) => s.done)).toHaveLength(0);
    // A profile needs both an avatar or bio and at least one platform.
    expect(welcomeSteps({ ...none, hasAvatarOrBio: true }, links)[0].done).toBe(false);
    expect(welcomeSteps({ ...none, hasAvatarOrBio: true, platformCount: 1 }, links)[0].done).toBe(true);
    const some = welcomeSteps({ ...none, introduced: true, pickups: 2, follows: 1 }, links);
    expect(some.filter((s) => s.done).map((s) => s.id)).toEqual(["introduce", "pickup", "follow"]);
  });

  test("shown in the first 30 days until done or dismissed", () => {
    const now = new Date("2026-09-30T12:00:00Z");
    const steps = welcomeSteps(none, links);
    expect(showWelcome({ joinedAt: "2026-09-20T12:00:00Z", dismissedAt: null, steps, now })).toBe(true);
    expect(showWelcome({ joinedAt: "2026-08-20T12:00:00Z", dismissedAt: null, steps, now })).toBe(false);
    expect(showWelcome({ joinedAt: "2026-09-20T12:00:00Z", dismissedAt: "2026-09-25T00:00:00Z", steps, now })).toBe(false);
    const all = welcomeSteps({ hasAvatarOrBio: true, platformCount: 1, introduced: true, pickups: 1, answers: 1, follows: 1 }, links);
    expect(showWelcome({ joinedAt: "2026-09-20T12:00:00Z", dismissedAt: null, steps: all, now })).toBe(false);
  });
});
