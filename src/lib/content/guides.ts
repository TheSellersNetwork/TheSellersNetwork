import "server-only";
import { cache } from "react";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import matter from "gray-matter";

export type GuideMeta = {
  slug: string;
  title: string;
  excerpt: string;
  categories: string[];
  module: string | null;
  published: string | null;
  order: number;
};

export type Guide = GuideMeta & { content: string };

const dir = path.join(process.cwd(), "content", "guides");

/* Guides are MDX files with frontmatter. Unpublished ones (no date) are skipped in production. */
export const getGuides = cache(async (): Promise<GuideMeta[]> => {
  let files: string[] = [];
  try {
    files = (await readdir(dir)).filter((f) => f.endsWith(".mdx"));
  } catch {
    return [];
  }
  const guides = await Promise.all(
    files.map(async (file) => {
      const raw = await readFile(path.join(dir, file), "utf8");
      const { data } = matter(raw);
      return {
        slug: file.replace(/\.mdx$/, ""),
        title: String(data.title ?? file),
        excerpt: String(data.excerpt ?? ""),
        categories: Array.isArray(data.categories) ? data.categories.map(String) : [],
        module: data.module ? String(data.module) : null,
        published: data.published ? String(data.published) : null,
        order: Number(data.order ?? 999),
      } satisfies GuideMeta;
    }),
  );
  return guides.filter((g) => g.published || process.env.NODE_ENV !== "production").sort((a, b) => a.order - b.order);
});

export async function getGuide(slug: string): Promise<Guide | null> {
  const safe = slug.replace(/[^a-z0-9-]/g, "");
  try {
    const raw = await readFile(path.join(dir, `${safe}.mdx`), "utf8");
    const { data, content } = matter(raw);
    return {
      slug: safe,
      title: String(data.title ?? safe),
      excerpt: String(data.excerpt ?? ""),
      categories: Array.isArray(data.categories) ? data.categories.map(String) : [],
      module: data.module ? String(data.module) : null,
      published: data.published ? String(data.published) : null,
      order: Number(data.order ?? 999),
      content,
    };
  } catch {
    return null;
  }
}

/* The first guide tagged with the category (or its parent), for the topic right rail. */
export async function getGuideForCategory(slug: string | null): Promise<Pick<GuideMeta, "slug" | "title" | "excerpt"> | null> {
  if (!slug) return null;
  const guides = await getGuides();
  return guides.find((g) => g.categories.includes(slug)) ?? null;
}
