import "server-only";
import { cache } from "react";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import matter from "gray-matter";
import { defaultAuthor } from "@/lib/content/authors";
import { readingTime } from "@/lib/format";
import type { ChangeImpact, ChangeMeta, ChangePlatform, ChangeStatus } from "@/lib/tools/changes";

export type Change = ChangeMeta & { content: string };

const dir = path.join(process.cwd(), "content", "changes");

// YAML turns bare dates into Date objects; keep them as YYYY-MM-DD strings.
function day(value: unknown): string | null {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value).slice(0, 10);
}

function list(value: unknown): string[] {
  return Array.isArray(value) ? value.map(String).filter(Boolean) : [];
}

function toMeta(slug: string, data: Record<string, unknown>): ChangeMeta {
  return {
    slug,
    title: String(data.title ?? slug),
    platform: String(data.platform ?? "general") as ChangePlatform,
    date: day(data.date) ?? "1970-01-01",
    announced: day(data.announced),
    status: (["in-effect", "coming", "announced"].includes(String(data.status)) ? data.status : "in-effect") as ChangeStatus,
    impact: (["high", "medium", "low"].includes(String(data.impact)) ? data.impact : "medium") as ChangeImpact,
    affects: list(data.affects),
    summary: String(data.summary ?? ""),
    source: String(data.source ?? ""),
    sources: Array.isArray(data.sources)
      ? (data.sources as { title?: unknown; url?: unknown }[]).filter((s) => s && s.url).map((s) => ({ title: String(s.title ?? s.url), url: String(s.url) }))
      : [],
    forum: String(data.forum ?? "deals"),
    guides: list(data.guides),
    questions: list(data.questions),
    discussion: data.discussion ? String(data.discussion) : null,
    author: data.author ? String(data.author) : defaultAuthor(String(data.platform ?? "general")),
  };
}

/* Reading time in minutes for every change, by slug, for the blog index cards. */
export const getChangeReadingTimes = cache(async (): Promise<Map<string, number>> => {
  let files: string[] = [];
  try {
    files = (await readdir(dir)).filter((f) => f.endsWith(".mdx") && !f.startsWith("_"));
  } catch {
    return new Map();
  }
  const entries = await Promise.all(
    files.map(async (file) => {
      const { content } = matter(await readFile(path.join(dir, file), "utf8"));
      return [file.replace(/\.mdx$/, ""), readingTime(content)] as const;
    }),
  );
  return new Map(entries);
});

/* Every change, newest first. */
export const getChanges = cache(async (): Promise<ChangeMeta[]> => {
  let files: string[] = [];
  try {
    files = (await readdir(dir)).filter((f) => f.endsWith(".mdx") && !f.startsWith("_"));
  } catch {
    return [];
  }
  const changes = await Promise.all(
    files.map(async (file) => {
      const { data } = matter(await readFile(path.join(dir, file), "utf8"));
      return toMeta(file.replace(/\.mdx$/, ""), data);
    }),
  );
  return changes.sort((a, b) => b.date.localeCompare(a.date) || a.title.localeCompare(b.title));
});

export async function getChange(slug: string): Promise<Change | null> {
  const safe = slug.replace(/[^a-z0-9-]/g, "");
  try {
    const { data, content } = matter(await readFile(path.join(dir, `${safe}.mdx`), "utf8"));
    return { ...toMeta(safe, data), content };
  } catch {
    return null;
  }
}
