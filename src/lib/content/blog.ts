import "server-only";
import { cache } from "react";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import matter from "gray-matter";

export type BlogPlatform = "ebay" | "amazon" | "vinted" | "etsy" | "facebook" | "other";

export type BlogMeta = {
  slug: string;
  title: string;
  excerpt: string;
  platforms: BlogPlatform[];
  category: string | null;
  related_topic_ids: string[];
  cover: string | null;
  published: string | null;
  updated: string | null;
  discussion_topic_id: string | null;
};

export type BlogPost = BlogMeta & { content: string };

const dir = path.join(process.cwd(), "content", "blog");

function toMeta(file: string, data: Record<string, unknown>): BlogMeta {
  return {
    slug: file.replace(/\.mdx$/, ""),
    title: String(data.title ?? file),
    excerpt: String(data.excerpt ?? ""),
    platforms: Array.isArray(data.platforms) ? (data.platforms.map(String) as BlogPlatform[]) : [],
    category: data.category ? String(data.category) : null,
    related_topic_ids: Array.isArray(data.related_topic_ids) ? data.related_topic_ids.map(String) : [],
    cover: data.cover ? String(data.cover) : null,
    published: data.published ? new Date(String(data.published)).toISOString() : null,
    updated: data.updated ? new Date(String(data.updated)).toISOString() : null,
    discussion_topic_id: data.discussion_topic_id ? String(data.discussion_topic_id) : null,
  };
}

/* Published posts, newest first. Drafts (no published date) show outside production. */
export const getBlogPosts = cache(async (): Promise<BlogMeta[]> => {
  let files: string[] = [];
  try {
    files = (await readdir(dir)).filter((f) => f.endsWith(".mdx"));
  } catch {
    return [];
  }
  const posts = await Promise.all(
    files.map(async (file) => {
      const { data } = matter(await readFile(path.join(dir, file), "utf8"));
      return toMeta(file, data);
    }),
  );
  return posts
    .filter((p) => p.published || process.env.NODE_ENV !== "production")
    .sort((a, b) => (b.published ?? "9").localeCompare(a.published ?? "9"));
});

export async function getBlogPost(slug: string): Promise<BlogPost | null> {
  const safe = slug.replace(/[^a-z0-9-]/g, "");
  try {
    const raw = await readFile(path.join(dir, `${safe}.mdx`), "utf8");
    const { data, content } = matter(raw);
    return { ...toMeta(`${safe}.mdx`, data), content };
  } catch {
    return null;
  }
}

/* Headings for the table of contents. Matches ## and ### lines outside code fences. */
export function extractHeadings(markdown: string): { depth: number; text: string; id: string }[] {
  const out: { depth: number; text: string; id: string }[] = [];
  let inFence = false;
  for (const line of markdown.split("\n")) {
    if (line.startsWith("```")) inFence = !inFence;
    if (inFence) continue;
    const m = /^(##|###)\s+(.+?)\s*#*$/.exec(line);
    if (m) {
      const text = m[2].replace(/[*_`]/g, "");
      out.push({ depth: m[1].length, text, id: text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") });
    }
  }
  return out;
}
