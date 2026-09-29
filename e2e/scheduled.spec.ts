import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { test, expect } from "@playwright/test";

/*
  Scheduled blog posts stay hidden in production until their UK publish date.
  Uses the first debate post, dated 30 September 2026. Once that date has
  passed (or if the post has not been written yet) the test skips; the unit
  tests in src/lib/content cover the rule itself. Run against `next start`.
*/

/* E2E_SCHEDULED_SLUG points it at another future-dated post, for example a temporary fixture. */
const slug = process.env.E2E_SCHEDULED_SLUG ?? "debate-resellers-and-charity-shops";
const file = path.join(process.cwd(), "content", "blog", `${slug}.mdx`);
const published = existsSync(file) ? /^published:\s*"?(\d{4}-\d{2}-\d{2})/m.exec(readFileSync(file, "utf8"))?.[1] : undefined;
const ukToday = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/London" }).format(new Date());
const scheduled = !!published && published > ukToday;

test.describe("scheduled blog posts in production", () => {
  test.skip(!scheduled, `${slug} is missing or already live`);

  test("the post page returns 404 before its date", async ({ request }) => {
    const res = await request.get(`/blog/${slug}`);
    expect(res.status()).toBe(404);
  });

  test("the blog index and sitemap leave it out", async ({ request }) => {
    const blog = await request.get("/blog?type=articles");
    expect(blog.status()).toBe(200);
    expect(await blog.text()).not.toContain(`/blog/${slug}`);
    const sitemap = await request.get("/sitemap/0.xml");
    expect(sitemap.status()).toBe(200);
    expect(await sitemap.text()).not.toContain(`/blog/${slug}`);
  });
});
