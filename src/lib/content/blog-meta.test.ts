import { describe, expect, test } from "vitest";
import matter from "gray-matter";
import { parseDebate, toMeta } from "@/lib/content/blog-meta";
import { debateOpeningPost, dueDebates } from "@/lib/content/debate-sync";

const valid = { forum: "sourcing-and-stock", question: "Should resellers buy from charity shops?", options: ["Yes", "No", "Only some things", "It depends"] };

describe("debate frontmatter", () => {
  test("parses a well-formed debate block from real frontmatter", () => {
    const { data } = matter(`---
title: "Resellers and charity shops"
excerpt: "Is it fair?"
category: "debate"
published: 2026-09-30
debate:
  forum: sourcing-and-stock
  question: "Should resellers buy from charity shops?"
  options: ["Yes", "No", "Only some things", "It depends"]
---
Body`);
    const meta = toMeta("debate-resellers-and-charity-shops.mdx", data);
    expect(meta.slug).toBe("debate-resellers-and-charity-shops");
    expect(meta.published).toBe("2026-09-30T00:00:00.000Z");
    expect(meta.debate).toEqual(valid);
  });

  test("falls back to the deals forum when none is given", () => {
    expect(parseDebate("debate", { question: valid.question, options: valid.options })?.forum).toBe("deals");
  });

  test("ignores the block on posts that are not debates", () => {
    expect(parseDebate("guide", valid)).toBeNull();
    expect(parseDebate(undefined, valid)).toBeNull();
  });

  test("ignores malformed blocks", () => {
    expect(parseDebate("debate", undefined)).toBeNull();
    expect(parseDebate("debate", "a string")).toBeNull();
    expect(parseDebate("debate", ["a", "b"])).toBeNull();
    expect(parseDebate("debate", { ...valid, question: "?" })).toBeNull();
    expect(parseDebate("debate", { ...valid, question: "x".repeat(201) })).toBeNull();
    expect(parseDebate("debate", { ...valid, options: ["Yes", "No"] })).toBeNull();
    expect(parseDebate("debate", { ...valid, options: ["A", "B", "C", "D", "E", "F"] })).toBeNull();
    expect(parseDebate("debate", { ...valid, options: ["A", "B", ""] })).toBeNull();
    expect(parseDebate("debate", { ...valid, options: ["A", "B", "x".repeat(81)] })).toBeNull();
    expect(parseDebate("debate", { ...valid, options: ["A", "B", 3] })).toBeNull();
    expect(parseDebate("debate", { ...valid, options: ["A", "B", "a"] })).toBeNull();
    expect(parseDebate("debate", { ...valid, options: "A, B, C" })).toBeNull();
  });

  test("trims the question and options", () => {
    expect(parseDebate("debate", { forum: " deals ", question: "  Fair or not?  ", options: [" A ", "B", "C"] })).toEqual({ forum: "deals", question: "Fair or not?", options: ["A", "B", "C"] });
  });
});

describe("debate threads", () => {
  const post = (slug: string, published: string | null, debate = true) =>
    toMeta(`${slug}.mdx`, { title: slug, excerpt: "Excerpt.", category: debate ? "debate" : "guide", published, ...(debate ? { debate: valid } : {}) });

  test("only live debate posts are due", () => {
    const now = new Date("2026-09-30T07:00:00Z");
    const due = dueDebates([post("today", "2026-09-30"), post("earlier", "2026-09-01"), post("tomorrow", "2026-10-01"), post("draft", null), post("article", "2026-09-01", false)], now);
    expect(due.map((p) => p.slug)).toEqual(["today", "earlier"]);
  });

  test("the opening post summarises, links and asks for a vote", () => {
    const body = debateOpeningPost({ slug: "debate-x", title: "Debate X", excerpt: "A short summary." });
    expect(body).toBe("A short summary.\n\nRead the full post: [Debate X](/blog/debate-x)\n\nVote in the poll and tell us why below.");
  });
});
