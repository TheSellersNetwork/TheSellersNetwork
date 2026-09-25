/*
  Publish hook for the blog. For every published MDX post in content/blog,
  upserts the blog_posts row and, if it has no discussion thread yet, creates
  one in the matching forum category and writes the topic id back to the MDX
  frontmatter. Run after adding or publishing a post: npm run blog:sync

  Needs SUPABASE_SERVICE_ROLE_KEY and SEED_AUTHOR_EMAIL in .env.local.
*/

import { config } from "dotenv";
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { createClient } from "@supabase/supabase-js";

config({ path: ".env.local" });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const authorEmail = process.env.SEED_AUTHOR_EMAIL;
if (!url || !key || !authorEmail) throw new Error("NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY and SEED_AUTHOR_EMAIL are required");

const supabase = createClient(url, key, { auth: { persistSession: false } });
const dir = path.join(process.cwd(), "content", "blog");

/* Blog categories map to a forum category for the discussion thread. */
const categoryForPost = (category: string | null, platforms: string[]): string => {
  if (category === "roundup" || category === "spotlight") return "introductions";
  if (platforms.length === 1 && platforms[0] === "ebay") return "ebay-listings-and-titles";
  if (platforms.length === 1 && platforms[0] === "amazon") return "amazon-listings-and-content";
  if (platforms.length === 1 && platforms[0] === "vinted") return "vinted";
  if (platforms.length === 1 && platforms[0] === "etsy") return "etsy-and-handmade";
  return "multi-channel-selling";
};

async function main() {
  const { data: users } = await supabase.auth.admin.listUsers({ perPage: 1000 });
  const author = users.users.find((u) => u.email?.toLowerCase() === authorEmail!.toLowerCase());
  if (!author) throw new Error(`No auth user with email ${authorEmail}`);

  const { data: categories } = await supabase.from("categories").select("id, slug");
  const bySlug = new Map((categories ?? []).map((c) => [c.slug, c.id]));

  for (const file of readdirSync(dir).filter((f) => f.endsWith(".mdx") && !f.startsWith("_"))) {
    const full = path.join(dir, file);
    const raw = readFileSync(full, "utf8");
    const parsed = matter(raw);
    const slug = file.replace(/\.mdx$/, "");
    if (!parsed.data.published) {
      console.log(`Skipping draft ${slug}`);
      continue;
    }

    let topicId = parsed.data.discussion_topic_id as string | undefined;
    if (!topicId) {
      const categorySlug = categoryForPost(parsed.data.category ?? null, parsed.data.platforms ?? []);
      const categoryId = bySlug.get(categorySlug);
      if (!categoryId) throw new Error(`Category ${categorySlug} missing. Run npm run seed first.`);
      const { data: topic, error } = await supabase
        .from("topics")
        .insert({ title: `Discussion: ${parsed.data.title}`, category_id: categoryId, author_id: author.id })
        .select("id")
        .single();
      if (error) throw error;
      await supabase.from("posts").insert({
        topic_id: topic.id,
        author_id: author.id,
        body_md: `This thread is for discussing the blog post [${parsed.data.title}](/blog/${slug}).\n\n${parsed.data.excerpt ?? ""}`,
      });
      topicId = topic.id;
      parsed.data.discussion_topic_id = topicId;
      writeFileSync(full, matter.stringify(parsed.content, parsed.data));
      console.log(`Created discussion thread for ${slug}`);
    }

    const { error } = await supabase.from("blog_posts").upsert(
      {
        slug,
        title: parsed.data.title,
        excerpt: parsed.data.excerpt ?? null,
        author_id: author.id,
        published_at: new Date(parsed.data.published).toISOString(),
        category: parsed.data.category ?? null,
        platforms: parsed.data.platforms ?? [],
        related_topic_ids: parsed.data.related_topic_ids ?? [],
        discussion_topic_id: topicId,
        cover: parsed.data.cover ?? null,
      },
      { onConflict: "slug" },
    );
    if (error) throw error;
    console.log(`Synced ${slug}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
