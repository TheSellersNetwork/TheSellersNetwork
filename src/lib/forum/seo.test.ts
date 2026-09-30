import { describe, expect, it } from "vitest";
import {
  categoryDescription,
  categoryHasTopics,
  categoryTitle,
  isListVariant,
  listIndexing,
  MAX_LD_REPLIES,
  MIN_TAG_TOPICS,
  tagDescription,
  tagIsIndexable,
  topicStructuredData,
  type LdPost,
} from "./seo";

type Person = { "@type": string; name: string; url: string };
type Counter = { interactionType: string; userInteractionCount: number };
type Reply = { text: string; datePublished?: string; author: Person };
type Forum = { "@type": string; headline: string; url: string; text: string; datePublished: string; author: Person; isPartOf?: { name: string }; comment: Reply[]; interactionStatistic: Counter[] };
type QA = { "@type": string; mainEntity: { "@type": string; answerCount: number; acceptedAnswer: Reply; suggestedAnswer: Reply[] } };
const asForum = (d: unknown) => d as Forum;
const asQA = (d: unknown) => d as QA;

const post = (n: number, likes = 0): LdPost => ({
  text: `Post ${n}`,
  datePublished: `2026-09-${String(10 + n).padStart(2, "0")}T10:00:00Z`,
  author: { name: `Member ${n}`, url: `/community/u/member${n}` },
  likeCount: likes,
  url: `/community/t/a-topic/abc123${n > 1 ? `#post-${n}` : ""}`,
});

const base = {
  title: "Is Vinted Pro worth it?",
  url: "/community/t/a-topic/abc123",
  opening: post(1, 4),
  replies: [post(2, 1), post(3)],
  accepted: null,
  dateModified: "2026-09-20T10:00:00Z",
  forum: { name: "Vinted", url: "/community/c/vinted" },
};

describe("list pages", () => {
  it("treats any filter, sort or page in the address as a variant", () => {
    expect(isListVariant({})).toBe(false);
    expect(isListVariant(undefined)).toBe(false);
    expect(isListVariant({ view: "top" })).toBe(true);
    expect(isListVariant({ cursor: "abc" })).toBe(true);
    expect(isListVariant({ status: "" })).toBe(false);
    expect(isListVariant({ utm_source: "x" })).toBe(false);
  });

  it("canonicalises the plain page and noindexes variants and empty lists, never both signals at once", () => {
    expect(listIndexing("/community/c/ebay", {})).toEqual({ alternates: { canonical: "/community/c/ebay" } });
    const variant = listIndexing("/community/c/ebay", { view: "top" });
    expect(variant).toEqual({ robots: { index: false, follow: true } });
    expect(variant).not.toHaveProperty("alternates");
    expect(listIndexing("/community/c/ebay", {}, false)).toEqual({ robots: { index: false, follow: true } });
  });

  it("counts sub-forum topics towards a parent forum", () => {
    const parent = { id: "p", parent_id: null, topic_count: 0 };
    expect(categoryHasTopics(parent, [parent])).toBe(false);
    expect(categoryHasTopics(parent, [parent, { id: "c", parent_id: "p", topic_count: 2 }])).toBe(true);
  });

  it("indexes a tag only once it has enough topics", () => {
    expect(tagIsIndexable({ topic_count: MIN_TAG_TOPICS - 1 })).toBe(false);
    expect(tagIsIndexable({ topic_count: MIN_TAG_TOPICS })).toBe(true);
  });

  it("writes titles and descriptions that say what the page is", () => {
    expect(categoryTitle("eBay")).toBe("eBay forum for UK sellers");
    expect(categoryTitle("General forum")).toBe("General forum");
    expect(categoryDescription("eBay", null)).toMatch(/eBay from UK resellers/);
    expect(categoryDescription("eBay", "  Our own words.  ")).toBe("Our own words.");
    expect(tagDescription("Pokémon", 1)).toMatch(/^1 forum topic about/);
    expect(tagDescription("Pokémon", 4)).toMatch(/^4 forum topics about/);
  });
});

describe("topic markup", () => {
  it("is a DiscussionForumPosting with Google's required fields and datePublished on every reply", () => {
    const d = asForum(topicStructuredData(base));
    expect(d["@type"]).toBe("DiscussionForumPosting");
    expect(d.headline).toBe(base.title);
    expect(d.author).toMatchObject({ "@type": "Person", name: "Member 1" });
    expect(d.author.url).toMatch(/^https?:\/\/.+\/community\/u\/member1$/);
    expect(d.datePublished).toBe(base.opening.datePublished);
    expect(d.text).toBe("Post 1");
    expect(d.url).toMatch(/^https?:\/\/.+\/community\/t\/a-topic\/abc123$/);
    expect(d.isPartOf).toMatchObject({ name: "Vinted" });
    expect(d.comment).toHaveLength(2);
    expect((d as unknown as { commentCount: number }).commentCount).toBe(2);
    for (const c of d.comment) {
      expect(c).toHaveProperty("datePublished");
      expect(c).not.toHaveProperty("dateCreated");
      expect(c.author.url).toMatch(/^https?:\/\//);
    }
    const counts = d.interactionStatistic.map((c) => [c.interactionType, c.userInteractionCount]);
    expect(counts).toEqual([
      ["https://schema.org/CommentAction", 2],
      ["https://schema.org/LikeAction", 4],
    ]);
  });

  it("is a QAPage once an answer is accepted, without repeating it as a suggested answer", () => {
    const d = asQA(topicStructuredData({ ...base, accepted: base.replies[0] }));
    expect(d["@type"]).toBe("QAPage");
    expect(d.mainEntity["@type"]).toBe("Question");
    expect(d.mainEntity.answerCount).toBe(2);
    expect(d.mainEntity.acceptedAnswer.text).toBe("Post 2");
    expect(d.mainEntity.acceptedAnswer).toHaveProperty("datePublished");
    expect(d.mainEntity.suggestedAnswer.map((a) => a.text)).toEqual(["Post 3"]);
  });

  it("caps very long threads but keeps the true reply count", () => {
    const many = Array.from({ length: MAX_LD_REPLIES + 20 }, (_, i) => post(i + 2));
    const d = asForum(topicStructuredData({ ...base, replies: many }));
    expect(d.comment).toHaveLength(MAX_LD_REPLIES);
    expect(d.interactionStatistic[0].userInteractionCount).toBe(MAX_LD_REPLIES + 20);
  });

  it("leaves out isPartOf for a topic with no forum", () => {
    expect(topicStructuredData({ ...base, forum: null })).not.toHaveProperty("isPartOf");
  });
});
