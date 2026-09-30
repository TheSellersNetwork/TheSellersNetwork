/*
  Search rules for the forum, in one place so every page follows them:

  - Filtered, sorted and paged lists (?view=, ?status=, ?period=, ?cursor=)
    are noindex, follow. Google still follows their links to topics, but only
    the plain list is indexed, so the same topics are not listed under many
    addresses.
  - A forum with no topics yet, and a tag on fewer than MIN_TAG_TOPICS
    topics, is noindex, follow until it has something to show. Thin pages
    count against the whole site, and a new forum starts empty.
  - Topics use Google's forum markup: DiscussionForumPosting, or QAPage once
    an answer is accepted. Dates are datePublished, as Google asks.
    https://developers.google.com/search/docs/appearance/structured-data/discussion-forum
    https://developers.google.com/search/docs/appearance/structured-data/qapage
*/

import type { Metadata } from "next";
import { siteConfig } from "@/lib/site";

export const MIN_TAG_TOPICS = 3;
/* Google reads the replies shown on the page; this keeps very long threads to a sensible size. */
export const MAX_LD_REPLIES = 50;

const LIST_PARAMS = ["view", "status", "period", "cursor", "page", "sort"] as const;

type Params = Record<string, string | string[] | undefined>;

/* True when a list page has any filter, sort or paging in its address. */
export function isListVariant(sp: Params | undefined): boolean {
  if (!sp) return false;
  return LIST_PARAMS.some((k) => {
    const v = sp[k];
    return typeof v === "string" ? v !== "" : Array.isArray(v) && v.length > 0;
  });
}

const NOINDEX_FOLLOW: Metadata["robots"] = { index: false, follow: true };

/*
  Robots and canonical for a forum list page. The plain page is canonical to
  itself; a variant is noindex, follow with no canonical, so the two signals
  never disagree.
*/
export function listIndexing(path: string, sp: Params | undefined, hasContent = true): Pick<Metadata, "robots" | "alternates"> {
  if (isListVariant(sp) || !hasContent) return { robots: NOINDEX_FOLLOW };
  return { alternates: { canonical: path } };
}

/* A forum counts its own topics and its sub-forums' topics. */
export function categoryHasTopics(category: { id: string; topic_count: number }, all: { id?: string; parent_id: string | null; topic_count: number }[]): boolean {
  const children = all.filter((c) => c.parent_id === category.id).reduce((n, c) => n + (c.topic_count ?? 0), 0);
  return (category.topic_count ?? 0) + children > 0;
}

export function tagIsIndexable(tag: { topic_count: number }): boolean {
  return (tag.topic_count ?? 0) >= MIN_TAG_TOPICS;
}

/* "eBay forum for UK sellers", unless the name already says forum. */
export function categoryTitle(name: string): string {
  return /\bforum\b/i.test(name) ? name : `${name} forum for UK sellers`;
}

export function categoryDescription(name: string, description: string | null | undefined): string {
  const own = description?.trim();
  if (own) return own;
  return `Questions, answers and discussion about ${name} from UK resellers on ${siteConfig.name}.`;
}

export function tagDescription(name: string, count: number): string {
  return `${count} forum ${count === 1 ? "topic" : "topics"} about ${name} from UK resellers on ${siteConfig.name}: questions, answers and what worked.`;
}

/* ---------- Topic markup ---------- */

export type LdPerson = { name: string; url: string };
export type LdPost = { text: string; datePublished: string; author: LdPerson; likeCount: number; url: string };

const abs = (url: string) => (url.startsWith("http") ? url : `${siteConfig.url}${url}`);
const person = (p: LdPerson) => ({ "@type": "Person", name: p.name, url: abs(p.url) });
const likes = (n: number) => ({ "@type": "InteractionCounter", interactionType: "https://schema.org/LikeAction", userInteractionCount: n });

export function topicStructuredData(t: {
  title: string;
  url: string;
  opening: LdPost;
  replies: LdPost[];
  accepted: LdPost | null;
  dateModified: string;
  forum: { name: string; url: string } | null;
}): Record<string, unknown> {
  const replies = t.replies.slice(0, MAX_LD_REPLIES);
  const isPartOf = t.forum ? { isPartOf: { "@type": "WebPage", name: t.forum.name, url: abs(t.forum.url) } } : {};

  if (t.accepted) {
    const answer = (a: LdPost) => ({
      "@type": "Answer",
      text: a.text,
      datePublished: a.datePublished,
      upvoteCount: a.likeCount,
      url: abs(a.url),
      author: person(a.author),
    });
    return {
      "@context": "https://schema.org",
      "@type": "QAPage",
      ...isPartOf,
      mainEntity: {
        "@type": "Question",
        name: t.title,
        text: t.opening.text,
        datePublished: t.opening.datePublished,
        dateModified: t.dateModified,
        author: person(t.opening.author),
        answerCount: t.replies.length,
        upvoteCount: t.opening.likeCount,
        acceptedAnswer: answer(t.accepted),
        suggestedAnswer: replies.filter((a) => a.url !== t.accepted!.url).map(answer),
      },
    };
  }

  return {
    "@context": "https://schema.org",
    "@type": "DiscussionForumPosting",
    ...isPartOf,
    headline: t.title,
    url: abs(t.url),
    text: t.opening.text,
    datePublished: t.opening.datePublished,
    dateModified: t.dateModified,
    author: person(t.opening.author),
    commentCount: t.replies.length,
    interactionStatistic: [
      { "@type": "InteractionCounter", interactionType: "https://schema.org/CommentAction", userInteractionCount: t.replies.length },
      likes(t.opening.likeCount),
    ],
    comment: replies.map((c) => ({
      "@type": "Comment",
      text: c.text,
      datePublished: c.datePublished,
      url: abs(c.url),
      author: person(c.author),
      interactionStatistic: likes(c.likeCount),
    })),
  };
}
