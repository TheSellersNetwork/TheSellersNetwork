/*
  Generates this week's Friday roundup draft from the template, filling in the
  top solved threads and most discussed topics with their authors credited.
  Output: content/blog/roundup-YYYY-MM-DD.mdx (a draft until Tom adds a date).
  Needs SUPABASE_SERVICE_ROLE_KEY in .env.local.
*/

import { config } from "dotenv";
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

config({ path: ".env.local" });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required");
const supabase = createClient(url, key, { auth: { persistSession: false } });

type Row = { title: string; slug: string; short_id: string; reply_count: number; like_count: number; solution: { author: { username: string } | null } | null };

async function main() {
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const [{ data: solved }, { data: discussed }] = await Promise.all([
    supabase
      .from("topics")
      .select("title, slug, short_id, reply_count, like_count, solution:posts!topics_solution_post_fk (author:profiles!posts_author_id_fkey (username))")
      .eq("is_solved", true)
      .is("deleted_at", null)
      .gte("updated_at", since)
      .order("like_count", { ascending: false })
      .limit(5),
    supabase.from("topics").select("title, slug, short_id, reply_count, like_count").is("deleted_at", null).gte("last_post_at", since).order("reply_count", { ascending: false }).limit(5),
  ]);

  const solvedLines = ((solved ?? []) as unknown as Row[]).map((t) => `- [${t.title}](/community/t/${t.slug}/${t.short_id}), answered by @${t.solution?.author?.username ?? "[TOM: author]"}`);
  const discussedLines = ((discussed ?? []) as unknown as Row[]).map((t) => `- [${t.title}](/community/t/${t.slug}/${t.short_id}), ${t.reply_count} replies`);

  const template = readFileSync(path.join(process.cwd(), "content", "blog", "_roundup-template.mdx"), "utf8");
  const fill = (src: string, marker: string, lines: string[]) =>
    src.replace(new RegExp(`<!-- roundup:${marker} -->[\\s\\S]*?<!-- /roundup:${marker} -->`), `<!-- roundup:${marker} -->\n${lines.length ? lines.join("\n") : "- [TOM: nothing this week]"}\n<!-- /roundup:${marker} -->`);

  const today = new Date().toISOString().slice(0, 10);
  const out = fill(fill(template, "solved", solvedLines), "discussed", discussedLines).replace("[TOM: date]", today);
  const file = path.join(process.cwd(), "content", "blog", `roundup-${today}.mdx`);
  writeFileSync(file, out);
  console.log(`Wrote ${file}. Add a published date when it is ready.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
