import { describe, expect, test } from "vitest";
import { renderComment, validateComment, voteShare } from "@/lib/pickups-comments";
import { averageLuminance, photoHints } from "@/lib/pickups-photo";

describe("pickup comments", () => {
  test("escapes HTML so a comment cannot carry its own markup", () => {
    const html = renderComment(`<img src=x onerror=alert(1)> "quoted" & 'single'`);
    expect(html).not.toContain("<img");
    expect(html).toContain("&lt;img src=x onerror=alert(1)&gt;");
    expect(html).toContain("&quot;quoted&quot; &amp; &#39;single&#39;");
  });

  test("light markdown: bold, italic, code, paragraphs and line breaks", () => {
    expect(renderComment("**Great** find, *really*")).toBe("<p><strong>Great</strong> find, <em>really</em></p>");
    expect(renderComment("Use `**not bold**` here")).toBe("<p>Use <code>**not bold**</code> here</p>");
    expect(renderComment("one\ntwo\n\nthree")).toBe("<p>one<br>two</p><p>three</p>");
    expect(renderComment("snake_case_word stays")).toBe("<p>snake_case_word stays</p>");
  });

  test("links get nofollow and only http or https", () => {
    expect(renderComment("[sold comps](https://example.test/a_b)")).toBe('<p><a href="https://example.test/a_b" rel="nofollow ugc noopener" class="external">sold comps</a></p>');
    expect(renderComment("see https://example.test.")).toBe('<p>see <a href="https://example.test" rel="nofollow ugc noopener" class="external">https://example.test</a>.</p>');
    expect(renderComment("[x](javascript:alert(1))")).not.toContain("<a");
    expect(renderComment('https://x.test/"onmouseover="alert(1)')).not.toContain('"onmouseover');
  });

  test("mentions link to profiles", () => {
    expect(renderComment("thanks @Tom_1")).toBe('<p>thanks <a href="/community/u/tom_1" class="mention">@tom_1</a></p>');
    expect(renderComment("me@example.test")).not.toContain("mention");
  });

  test("new members cannot post links, others can", () => {
    expect(validateComment("see www.example.test", 0)).toMatch(/cannot post links/);
    expect(validateComment("see https://example.test", 1)).toBeNull();
    expect(validateComment("see https://example.test", 0, true)).toBeNull();
    expect(validateComment("   ", 2)).toBe("Write something first.");
    expect(validateComment("x".repeat(2001), 2)).toMatch(/at most/);
  });

  test("vote shares add up to 100", () => {
    expect(voteShare(0, 0)).toBeNull();
    expect(voteShare(1, 2)).toEqual({ yes: 33, no: 67, total: 3 });
    expect(voteShare(5, 0)).toEqual({ yes: 100, no: 0, total: 5 });
  });
});

describe("pickup photo hints", () => {
  test("dark and small photos get a hint, good ones do not", () => {
    expect(photoHints({ width: 1600, height: 1200, luminance: 0.5 })).toEqual([]);
    expect(photoHints({ width: 1600, height: 1200, luminance: 0.1 })[0]).toMatch(/dark/);
    expect(photoHints({ width: 640, height: 480, luminance: 0.5 })[0]).toMatch(/640px/);
    expect(photoHints({ width: 640, height: 480, luminance: 0.1 })).toHaveLength(2);
    expect(photoHints({ width: 0, height: 0, luminance: null })).toEqual([]);
  });

  test("average luminance of pixel data", () => {
    expect(averageLuminance([0, 0, 0, 255, 255, 255, 255, 255])).toBeCloseTo(0.5);
    expect(averageLuminance([255, 255, 255, 0])).toBeNull();
  });
});
