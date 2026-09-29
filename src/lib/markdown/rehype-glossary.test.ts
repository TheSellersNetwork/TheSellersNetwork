import { describe, expect, test } from "vitest";
import { renderMarkdown } from "@/lib/markdown/render";

const count = (html: string, needle: string) => html.split(needle).length - 1;

describe("glossary terms in forum posts", () => {
  test("marks the first use of each term only", async () => {
    const html = await renderMarkdown("I sell on FBA. More FBA stock soon, and some FBM too.");
    expect(count(html, 'class="gloss"')).toBe(2);
    expect(html).toContain('<abbr class="gloss" data-term="FBA" title="Fulfilled by Amazon.');
    expect(html).toContain('tabindex="0">FBA</abbr>. More FBA stock');
    expect(html).toContain('data-term="FBM"');
  });

  test("matches case-insensitive terms and leaves ordinary words alone", async () => {
    const html = await renderMarkdown("Won the buy box today. I will vat the soup.");
    expect(html).toContain('data-term="Buy Box"');
    expect(html).toContain(">buy box</abbr>");
    expect(html).not.toContain('data-term="VAT"');
  });

  test("never marks inside links, code or headings", async () => {
    const html = await renderMarkdown("## FBA basics\n\n[FBA help](https://example.com) and `FBA` and\n\n```\nFBA\n```\n\nThen FBA here.");
    expect(count(html, 'class="gloss"')).toBe(1);
    expect(html).toContain("<h2>FBA basics</h2>");
    expect(html).toContain("<code>FBA</code>");
    expect(html).toContain('<p>Then <abbr class="gloss"');
  });

  test("a member's own abbr or attributes are not passed through", async () => {
    const html = await renderMarkdown('<abbr class="gloss" title="<script>x</script>" onclick="x()">ROI</abbr> and ROI');
    expect(html).not.toContain("onclick");
    expect(html).not.toContain("<script");
    expect(count(html, "<abbr")).toBe(1);
    expect(html).toContain('data-term="ROI"');
  });

  test("definitions are escaped in the title attribute", async () => {
    const html = await renderMarkdown("Check the ASIN first.");
    expect(html).toMatch(/title="[^"<>]*"/);
  });

  test("can be switched off", async () => {
    const html = await renderMarkdown("FBA and ROI", { glossary: false });
    expect(html).not.toContain("<abbr");
  });

  test("mentions still become links next to glossary terms", async () => {
    const html = await renderMarkdown("@someone asked about SNAD");
    expect(html).toContain('href="/community/u/someone"');
    expect(html).toContain('data-term="SNAD"');
  });
});
