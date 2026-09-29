import { describe, expect, it } from "vitest";
import { firstImageUrl, plainExcerpt, topicPreview } from "./previews";

const storage = "https://abc.supabase.co";

describe("firstImageUrl", () => {
  it("returns the first image from our storage", () => {
    const md = "Text\n\n![shelf](https://abc.supabase.co/storage/v1/object/public/post-images/a.webp)\n![two](https://abc.supabase.co/b.webp)";
    expect(firstImageUrl(md, storage)).toBe("https://abc.supabase.co/storage/v1/object/public/post-images/a.webp");
  });

  it("ignores images from other hosts", () => {
    expect(firstImageUrl("![x](https://example.com/a.png)", storage)).toBeNull();
    expect(firstImageUrl("![x](https://other.supabase.co/a.png)", storage)).toBeNull();
  });

  it("ignores plain links and missing images", () => {
    expect(firstImageUrl("[not an image](https://abc.supabase.co/a.png)", storage)).toBeNull();
    expect(firstImageUrl("no images here", storage)).toBeNull();
  });
});

describe("plainExcerpt", () => {
  it("strips Markdown syntax", () => {
    const md = "## Heading\n\n**Bold** and _italic_ with a [link](https://x.test) and `code`.\n\n- item one\n> quoted";
    expect(plainExcerpt(md)).toBe("Heading Bold and italic with a link and code. item one quoted");
  });

  it("drops images and code blocks", () => {
    expect(plainExcerpt("Before ![a](https://x.test/a.png)\n```\nconst x = 1;\n```\nafter")).toBe("Before after");
  });

  it("shortens on a word boundary", () => {
    const out = plainExcerpt("alpha beta gamma delta", 12);
    expect(out).toBe("alpha beta…");
  });
});

describe("topicPreview", () => {
  it("is null for empty bodies", () => {
    expect(topicPreview(null)).toBeNull();
    expect(topicPreview("")).toBeNull();
  });
});
