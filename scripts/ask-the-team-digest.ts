/*
  Drafts the monthly "Ask the team" blog post from the questions staff answered in
  the last window: every topic in the ask-the-team category tagged
  ask-the-team-answered in the last 35 days, with the question, a link and the
  accepted answer. Output: content/blog/ask-the-team-YYYY-MM.mdx as a draft.
  Needs SUPABASE_SERVICE_ROLE_KEY in .env.local.
*/

import { config } from "dotenv";
import { writeFileSync } from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

config({ path: ".env.local" });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required");
const supabase = createClient(url, key, { auth: { persistSession: false } });

type Row = {
  title: string;
  slug: string;
  short_id: string;
  author: { username: string } | null;
  solution: { body_md: string } | null;
  opening: { body_md: string }[];
};

async function main() {
  const since = new Date(Date.now() - 35 * 24 * 60 * 60 * 1000).toISOString();
  const { data: tag } = await supabase.from("tags").select("id").eq("slug", "ask-the-team-answered").maybeSingle();
  if (!tag) {
    console.log("No answered questions yet.");
    return;
  }
  const { data: links } = await supabase.from("topic_tags").select("topic_id").eq("tag_id", tag.id).gte("created_at", since);
  const ids = (links ?? []).map((l) => l.topic_id as string);
  if (ids.length === 0) {
    console.log("No answered questions in the last 35 days.");
    return;
  }
  const { data } = await supabase
    .from("topics")
    .select("title, slug, short_id, author:profiles!topics_author_id_fkey (username), solution:posts!topics_solution_post_fk (body_md), opening:posts!posts_topic_id_fkey (body_md)")
    .in("id", ids)
    .order("created_at", { ascending: true });

  const month = new Date().toISOString().slice(0, 7);
  const sections = ((data ?? []) as unknown as Row[])
    .map((t) => {
      const question = (t.opening?.[0]?.body_md ?? "").trim();
      const answer = (t.solution?.body_md ?? "").trim();
      return `## ${t.title}\n\nAsked by @${t.author?.username ?? "member"} ([thread](/community/t/${t.slug}/${t.short_id}))\n\n> ${question.split("\n").join("\n> ")}\n\n${answer}\n`;
    })
    .join("\n");

  const mdx = `---\ntitle: "Ask the team: [EDIT: month] answers"\nexcerpt: "[EDIT: one line on the themes this month]"\nplatforms: [ebay, amazon, vinted, other]\ncategory: "ask-the-team"\nrelated_topic_ids: []\ncover:\npublished:\n---\n\n<Placeholder>Intro for this month's answers. Edit the answers below freely; they are copied from the threads.</Placeholder>\n\n${sections}\n<Signup source="/blog/ask-the-team-${month}" />\n`;
  const file = path.join(process.cwd(), "content", "blog", `ask-the-team-${month}.mdx`);
  writeFileSync(file, mdx);
  console.log(`Wrote ${file} with ${ids.length} answered question(s). Add a published date when ready.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
