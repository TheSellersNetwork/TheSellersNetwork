import { bodyStats, excerpt, renderMarkdown, validateBody } from "./render";

describe("renderMarkdown", () => {
  it("renders basic markdown", async () => {
    const html = await renderMarkdown("**bold** and _italic_");
    expect(html).toContain("<strong>bold</strong>");
    expect(html).toContain("<em>italic</em>");
  });

  it("strips scripts and event handlers", async () => {
    const html = await renderMarkdown('<script>alert(1)</script><a href="javascript:alert(1)" onclick="x()">x</a>');
    expect(html).not.toContain("<script");
    expect(html).not.toContain("javascript:");
    expect(html).not.toContain("onclick");
  });

  it("links mentions to profiles", async () => {
    const html = await renderMarkdown("Thanks @tom_uk and @Someone, not email@example.test");
    expect(html).toContain('href="/community/u/tom_uk"');
    expect(html).toContain('href="/community/u/someone"');
    expect(html).not.toContain('href="/community/u/example"');
  });

  it("does not link mentions inside code", async () => {
    const html = await renderMarkdown("`@tom` in code");
    expect(html).not.toContain("/community/u/tom");
  });

  it("marks external links nofollow", async () => {
    const html = await renderMarkdown("[eBay](https://www.ebay.co.uk)");
    expect(html).toContain('rel="nofollow ugc noopener"');
  });

  it("drops images that are not from our own storage", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://proj.supabase.co");
    const html = await renderMarkdown("![a](https://proj.supabase.co/storage/v1/object/public/post-images/u/a.webp) ![b](https://tracker.test/pixel.png)");
    vi.unstubAllEnvs();
    expect(html).toContain("proj.supabase.co/storage");
    expect(html).not.toContain("tracker.test");
  });

  it("allows https images only when no Supabase URL is set", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    try {
      const html = await renderMarkdown("![a](https://x.test/a.png) ![b](http://x.test/b.png)");
      expect(html).toContain('src="https://x.test/a.png"');
      expect(html).not.toContain("http://x.test/b.png");
    } finally {
      vi.unstubAllEnvs();
    }
  });

  it("only allows images from the project's own storage once a Supabase URL is set", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://abc.supabase.co");
    try {
      const own = "https://abc.supabase.co/storage/v1/object/public/uploads/a.png";
      const html = await renderMarkdown(`![a](${own}) ![b](https://x.test/b.png)`);
      expect(html).toContain(`src="${own}"`);
      expect(html).not.toContain("x.test/b.png");
    } finally {
      vi.unstubAllEnvs();
    }
  });
});

describe("bodyStats and validateBody", () => {
  it("counts images, links and mentions", () => {
    const s = bodyStats("![a](https://x/a.png) [l](https://x) https://y.test @ann @bob @ann");
    expect(s).toMatchObject({ images: 1, links: 2, mentions: 2 });
  });

  it("caps TL0", () => {
    expect(validateBody("see https://x.test", 0)).toMatch(/links/);
    expect(validateBody("![a](https://x/a.png) ![b](https://x/b.png)", 0)).toMatch(/one image/);
    expect(validateBody("@ann @bob @cat", 0)).toMatch(/two people/);
    expect(validateBody("plain text", 0)).toBeNull();
  });

  it("caps TL1 images and lifts at TL2", () => {
    const six = Array(6).fill("![i](https://x/i.png)").join(" ");
    expect(validateBody(six, 1)).toMatch(/five images/);
    expect(validateBody(six, 2)).toBeNull();
  });
});

describe("excerpt", () => {
  it("strips markdown and truncates", () => {
    expect(excerpt("# Title\n\nSome **text** [link](https://x)")).toBe("Title Some text link");
    expect(excerpt("a".repeat(200), 20)).toHaveLength(20);
  });
});
