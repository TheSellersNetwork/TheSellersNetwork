import "server-only";
import { cache } from "react";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import matter from "gray-matter";
import { toMeta, type BlogMeta } from "@/lib/content/blog-meta";
import { isLive, showUnpublished } from "@/lib/content/schedule";
import { readingTime } from "@/lib/format";

export type { BlogMeta, BlogPlatform, Debate } from "@/lib/content/blog-meta";

export type BlogPost = BlogMeta & { content: string };

/* A post in a listing: its metadata plus reading time in minutes. */
export type BlogListing = BlogMeta & { minutes: number };

const dir = path.join(process.cwd(), "content", "blog");

/*
  Whether a post can be shown. In production only posts whose UK publish date
  has arrived; outside production drafts and scheduled posts show too, labelled,
  so staff can preview them.
*/
function visible(post: BlogMeta, now: Date): boolean {
  return showUnpublished() || isLive(post.published, now);
}

/* Live posts, newest first. Drafts and scheduled posts show outside production. */
export const getBlogPosts = cache(async (): Promise<BlogListing[]> => {
  let files: string[] = [];
  try {
    files = (await readdir(dir)).filter((f) => f.endsWith(".mdx"));
  } catch {
    return [];
  }
  const now = new Date();
  const posts = await Promise.all(
    files.filter((f) => !f.startsWith("_")).map(async (file) => {
      const { data, content } = matter(await readFile(path.join(dir, file), "utf8"));
      return { ...toMeta(file, data), minutes: readingTime(content) };
    }),
  );
  return posts
    .filter((p) => visible(p, now))
    .sort((a, b) => (b.published ?? "9").localeCompare(a.published ?? "9"));
});

export async function getBlogPost(slug: string): Promise<BlogPost | null> {
  const safe = slug.replace(/[^a-z0-9-]/g, "");
  try {
    const raw = await readFile(path.join(dir, `${safe}.mdx`), "utf8");
    const { data, content } = matter(raw);
    const post = { ...toMeta(`${safe}.mdx`, data), content };
    return visible(post, new Date()) ? post : null;
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
