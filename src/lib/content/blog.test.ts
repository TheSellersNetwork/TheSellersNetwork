import { afterEach, describe, expect, test, vi } from "vitest";

vi.mock("server-only", () => ({}));

/*
  Runs the real loader over content/blog with the clock set back to
  15 August 2026, so the posts dated after that stand in for scheduled posts.
*/
async function load(env: "production" | "development") {
  vi.resetModules();
  vi.stubEnv("NODE_ENV", env);
  return import("@/lib/content/blog");
}

describe("blog loader and scheduled posts", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.useRealTimers();
  });

  test("production hides posts dated after today (UK) and drafts; development shows them", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-08-15T12:00:00Z"));

    const dev = await (await load("development")).getBlogPosts();
    const prod = await load("production");
    const live = await prod.getBlogPosts();

    expect(live.length).toBeGreaterThan(0);
    for (const p of live) expect(p.published! <= "2026-08-15T23:59:59.999Z").toBe(true);

    const hidden = dev.filter((p) => !live.some((l) => l.slug === p.slug));
    expect(hidden.length).toBeGreaterThan(0);
    for (const p of hidden) expect(p.published === null || p.published > "2026-08-15").toBe(true);

    // The post page 404s: getBlogPost returns nothing for a scheduled slug.
    const scheduled = hidden.find((p) => p.published);
    expect(scheduled).toBeDefined();
    expect(await prod.getBlogPost(scheduled!.slug)).toBeNull();
    expect(await prod.getBlogPost(live[0].slug)).not.toBeNull();
  });
});
