import { describe, expect, it } from "vitest";
import { buildDigest, digestSubject, digestWeek, type DigestCategory, type DigestMember, type DigestTopicInput } from "./digest";

const categories: DigestCategory[] = [
  { id: "ebay", parent_id: null, is_private: false, allowed_group_id: null },
  { id: "ebay-postage", parent_id: "ebay", is_private: false, allowed_group_id: null },
  { id: "vinted", parent_id: null, is_private: false, allowed_group_id: null },
  { id: "mentoring", parent_id: null, is_private: true, allowed_group_id: "mentees" },
];

const member: DigestMember = {
  id: "me",
  is_staff: false,
  group_ids: [],
  following_category_ids: ["ebay"],
  muted_category_ids: [],
  followed_tag_ids: ["royal-mail"],
};

let n = 0;
function topic(over: Partial<DigestTopicInput>): DigestTopicInput {
  n += 1;
  return {
    id: `t${n}`,
    title: `Topic ${n}`,
    slug: `topic-${n}`,
    short_id: `abcd00${n}`,
    category_id: "vinted",
    author_id: "someone",
    created_at: `2026-09-2${n % 10}T10:00:00Z`,
    reply_count: 0,
    tag_ids: [],
    ...over,
  };
}

describe("buildDigest", () => {
  it("includes followed forums, their subforums and followed tags", () => {
    const a = topic({ category_id: "ebay" });
    const b = topic({ category_id: "ebay-postage" });
    const c = topic({ category_id: "vinted", tag_ids: ["royal-mail"] });
    const d = topic({ category_id: "vinted" });
    const out = buildDigest({ member, categories, topics: [a, b, c, d], unseenReplies: [], numbers: null });
    expect(out.topics.map((t) => t.id).sort()).toEqual([a.id, b.id, c.id].sort());
    expect(out.send).toBe(true);
  });

  it("leaves out own topics, muted forums and private forums the member cannot see", () => {
    const own = topic({ category_id: "ebay", author_id: "me" });
    const mutedSub = topic({ category_id: "ebay-postage" });
    const hidden = topic({ category_id: "mentoring", tag_ids: ["royal-mail"] });
    const out = buildDigest({ member: { ...member, muted_category_ids: ["ebay-postage"] }, categories, topics: [own, mutedSub, hidden], unseenReplies: [], numbers: null });
    expect(out.topics).toEqual([]);
    const mentee = buildDigest({ member: { ...member, group_ids: ["mentees"] }, categories, topics: [hidden], unseenReplies: [], numbers: null });
    expect(mentee.topics.map((t) => t.id)).toEqual([hidden.id]);
  });

  it("puts the busiest topics first and caps the list", () => {
    const topics = Array.from({ length: 12 }, (_, i) => topic({ category_id: "ebay", reply_count: i }));
    const out = buildDigest({ member, categories, topics, unseenReplies: [], numbers: null });
    expect(out.topics).toHaveLength(8);
    expect(out.topics[0].reply_count).toBe(11);
  });

  it("groups unseen replies by topic", () => {
    const r = { topic_id: "x", topic_title: "My question", topic_slug: "my-question", topic_short_id: "abcd1234" };
    const out = buildDigest({ member, categories, topics: [], unseenReplies: [r, r, { ...r, topic_id: "y" }], numbers: null });
    expect(out.replies.map((g) => [g.topic_id, g.count])).toEqual([
      ["x", 2],
      ["y", 1],
    ]);
    expect(out.send).toBe(true);
  });

  it("sends nothing when there is only the numbers thread", () => {
    const out = buildDigest({ member, categories, topics: [], unseenReplies: [], numbers: { title: "What did you sell this week?", slug: "n", short_id: "abcd9999" } });
    expect(out.send).toBe(false);
  });
});

describe("digestWeek", () => {
  it("returns the Monday of the week", () => {
    expect(digestWeek(new Date("2026-10-05T08:00:00Z"))).toBe("2026-10-05");
    expect(digestWeek(new Date("2026-10-04T23:00:00Z"))).toBe("2026-09-28");
    expect(digestWeek(new Date("2026-09-30T12:00:00Z"))).toBe("2026-09-28");
  });
});

describe("digestSubject", () => {
  it("counts replies and topics", () => {
    const subject = digestSubject({
      topics: [{ id: "a", title: "", slug: "", short_id: "", reply_count: 0 }],
      replies: [{ topic_id: "x", title: "", slug: "", short_id: "", count: 3 }],
      numbers: null,
      send: true,
    });
    expect(subject).toBe("Your week on The Sellers Network: 3 new replies to your topics, 1 new topic you follow");
  });
});
