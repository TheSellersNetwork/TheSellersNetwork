/*
  Opens the forum thread and poll for every debate blog post (category
  "debate" with a `debate:` block) whose UK publish date has arrived and which
  has no thread yet. The daily cron (/api/cron/rituals) does the same each
  morning; this is for manual runs.

    npm run debates:sync            create missing threads
    npm run debates:sync -- --dry   show what would be created

  Needs SUPABASE_SERVICE_ROLE_KEY and SEED_AUTHOR_EMAIL in .env.local, and
  migration 20260928001800 (polls) applied.
*/

import { config } from "dotenv";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { createClient } from "@supabase/supabase-js";
import { findHouseAccountId, findUserByEmail } from "./find-user";
import { toMeta } from "../src/lib/content/blog-meta";
import { dueDebates, syncDebates } from "../src/lib/content/debate-sync";

config({ path: ".env.local", quiet: true });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const authorEmail = process.env.SEED_AUTHOR_EMAIL;
if (!url || !key || !authorEmail) throw new Error("NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY and SEED_AUTHOR_EMAIL are required");
const supabase = createClient(url, key, { auth: { persistSession: false } });
const dry = process.argv.includes("--dry");
const dir = path.join(process.cwd(), "content", "blog");

async function main() {
  const posts = readdirSync(dir)
    .filter((f) => f.endsWith(".mdx") && !f.startsWith("_"))
    .map((file) => toMeta(file, matter(readFileSync(path.join(dir, file), "utf8")).data));
  const due = dueDebates(posts);
  if (due.length === 0) {
    console.log("No live debate posts.");
    return;
  }

  // Posted as the house account, The Sellers Network, once the seed has created it.
  const houseId = await findHouseAccountId(supabase);
  const author = houseId ? { id: houseId } : await findUserByEmail(supabase, authorEmail!);
  if (!author) throw new Error(`No house account and no auth user with email ${authorEmail}.`);

  const results = await syncDebates(supabase, author.id, due, { dry });
  for (const [slug, result] of Object.entries(results)) console.log(`${slug}: ${result}`);
  console.log(dry ? "Dry run finished." : "Done.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
