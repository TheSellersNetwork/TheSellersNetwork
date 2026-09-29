/*
  Opens a forum discussion for every change breakdown in content/changes that
  does not have one yet, with a "Does this affect you?" poll, then writes the
  topic's short id back into the file's frontmatter as `discussion:`.
  Commit the updated files afterwards so the site links to the threads.

    npm run changes:sync            create missing discussions
    npm run changes:sync -- --dry   show what would be created

  Needs SUPABASE_SERVICE_ROLE_KEY and SEED_AUTHOR_EMAIL in .env.local, and
  migration 20260928001800 (polls) applied.
*/

import { config } from "dotenv";
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { createClient } from "@supabase/supabase-js";
import { findHouseAccountId, findUserByEmail } from "./find-user";

config({ path: ".env.local", quiet: true });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const authorEmail = process.env.SEED_AUTHOR_EMAIL;
if (!url || !key || !authorEmail) throw new Error("NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY and SEED_AUTHOR_EMAIL are required");
const supabase = createClient(url, key, { auth: { persistSession: false } });
const dry = process.argv.includes("--dry");
const dir = path.join(process.cwd(), "content", "changes");

const POLL_QUESTION = "Does this change affect you?";
const POLL_OPTIONS = ["Yes, it costs me more", "Yes, it saves me money", "It changes how I work, not what I pay", "Not really", "Not sure yet"];

/* The bullet points under "## The short version", reused as the thread's opening. */
function shortVersion(content: string): string {
  const match = content.match(/## The short version\s*\n([\s\S]*?)(\n## |$)/);
  return match ? match[1].trim() : "";
}

async function main() {
  // Threads need their poll; without migration 1800 there is nowhere to put it.
  const { error: pollsMissing } = await supabase.from("polls").select("id").limit(1);
  if (pollsMissing) {
    console.log("Skipping: the polls table is missing. Apply supabase/migrations/20260928001800_polls_anonymous_push.sql first.");
    return;
  }
  // Threads are posted as the house account, The Sellers Network, once the seed has created it.
  const houseId = await findHouseAccountId(supabase);
  const author = houseId ? { id: houseId } : await findUserByEmail(supabase, authorEmail!);
  if (!author) throw new Error(`No house account and no auth user with email ${authorEmail}.`);
  const { data: categories } = await supabase.from("categories").select("id, slug");
  const bySlug = new Map((categories ?? []).map((c) => [c.slug as string, c.id as string]));

  const files = readdirSync(dir).filter((f) => f.endsWith(".mdx") && !f.startsWith("_"));
  let created = 0;
  for (const file of files) {
    const full = path.join(dir, file);
    const raw = readFileSync(full, "utf8");
    const { data, content } = matter(raw);
    if (data.discussion) continue;
    const slug = file.replace(/\.mdx$/, "");
    const categoryId = bySlug.get(String(data.forum ?? "deals")) ?? bySlug.get("deals");
    if (!categoryId) {
      console.warn(`Skipping ${slug}: no forum ${data.forum} or deals`);
      continue;
    }

    const questions = Array.isArray(data.questions) ? data.questions.map((q: unknown) => `- ${q}`).join("\n") : "";
    const body = [
      `**${data.summary}**`,
      `We have broken this down in plain English, with who it affects and what to do: [read the full breakdown](/blog/${slug}).`,
      shortVersion(content) ? `**The short version**\n\n${shortVersion(content)}` : "",
      questions ? `**Over to you**\n\n${questions}\n\nVote in the poll above, then tell us what it has done to your numbers.` : "Vote in the poll above, then tell us what it has done to your numbers.",
    ]
      .filter(Boolean)
      .join("\n\n");

    if (dry) {
      console.log(`Would create: ${data.title} (${data.forum ?? "deals"})`);
      continue;
    }

    const { data: topic, error } = await supabase.from("topics").insert({ title: String(data.title), category_id: categoryId, author_id: author.id }).select("id, short_id").single();
    if (error || !topic) {
      console.warn(`Failed ${slug}: ${error?.message}`);
      continue;
    }
    await supabase.from("posts").insert({ topic_id: topic.id, author_id: author.id, body_md: body });
    const { data: poll } = await supabase.from("polls").insert({ topic_id: topic.id, question: POLL_QUESTION }).select("id").single();
    if (poll) await supabase.from("poll_options").insert(POLL_OPTIONS.map((label, position) => ({ poll_id: poll.id, position, label })));

    // Add the short id just before the closing frontmatter fence, leaving the rest of the file untouched.
    const end = raw.indexOf("\n---", 3);
    writeFileSync(full, `${raw.slice(0, end)}\ndiscussion: "${topic.short_id}"${raw.slice(end)}`);
    created += 1;
    console.log(`Created discussion for ${slug}: ${topic.short_id}`);
  }
  console.log(dry ? "Dry run finished." : `${created} discussion(s) created. Commit content/changes so the site links to them.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
