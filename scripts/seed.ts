/*
  Seeds the launch categories with [TOM: ...] placeholders and a pinned
  "Read this first" topic in each, then optionally loads Tom's seed topics
  from a CSV. Idempotent: existing categories are updated by slug and intro
  topics are not duplicated.

  Usage:
    npm run seed                       categories and intro topics
    npm run seed -- --csv path.csv     also load topics from the CSV

  Needs SUPABASE_SERVICE_ROLE_KEY and SEED_AUTHOR_EMAIL (Tom's account) in .env.local.
  CSV columns: category_slug,title,body_md,author_username
  Nothing here invents content. Every intro is a placeholder for Tom.
*/

import { config } from "dotenv";
import { readFileSync } from "node:fs";
import { parse } from "csv-parse/sync";
import { createClient } from "@supabase/supabase-js";

config({ path: ".env.local" });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const authorEmail = process.env.SEED_AUTHOR_EMAIL;
if (!url || !key) throw new Error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required");
if (!authorEmail) throw new Error("SEED_AUTHOR_EMAIL (Tom's account email) is required");

const supabase = createClient(url, key, { auth: { persistSession: false } });

type Cat = { slug: string; name: string; colour: string; children?: Cat[]; min_account_age_hours?: number; description?: string; accepting_topics?: boolean; accepting_note?: string };

/* Launch categories: four platforms at top level, then Other platforms, then general. */
const launch: Cat[] = [
  {
    slug: "ebay",
    name: "eBay",
    colour: "ebay",
    children: [
      { slug: "ebay-listings-and-titles", name: "Listings and titles", colour: "ebay" },
      { slug: "ebay-pricing-and-offers", name: "Pricing and offers", colour: "ebay" },
      { slug: "ebay-postage-and-packaging", name: "Postage and packaging", colour: "ebay" },
      { slug: "ebay-buyers-and-disputes", name: "Buyers and disputes", colour: "ebay" },
      { slug: "ebay-account-health-and-policy", name: "Account health and policy", colour: "ebay" },
      { slug: "ebay-promoted-listings-and-traffic", name: "Promoted Listings and traffic", colour: "ebay" },
    ],
  },
  {
    slug: "amazon",
    name: "Amazon",
    colour: "amazon",
    children: [
      { slug: "amazon-fba-and-fbm", name: "FBA and FBM", colour: "amazon" },
      { slug: "amazon-listings-and-content", name: "Listings and content", colour: "amazon" },
      { slug: "amazon-ads-and-ppc", name: "Ads and PPC", colour: "amazon" },
      { slug: "amazon-account-health-and-suspensions", name: "Account health and suspensions", colour: "amazon" },
      { slug: "amazon-sourcing-and-wholesale", name: "Sourcing and wholesale", colour: "amazon" },
    ],
  },
  { slug: "vinted", name: "Vinted", colour: "vinted" },
  { slug: "facebook-marketplace", name: "Facebook Marketplace", colour: "facebook" },
  {
    slug: "live-selling",
    name: "Live selling",
    colour: "live",
    children: [
      { slug: "whatnot", name: "Whatnot", colour: "live" },
      { slug: "ebay-live", name: "eBay Live", colour: "live" },
      { slug: "tiktok-live-and-other", name: "TikTok Live and other live platforms", colour: "live" },
      { slug: "running-a-show", name: "Running a show", colour: "live", description: "Sourcing for lives, pacing, packing after a stream, chargebacks and refunds." },
    ],
  },
  {
    slug: "other-platforms",
    name: "Other platforms",
    colour: "website",
    children: [
      { slug: "depop-and-clothing-resale", name: "Depop and clothing resale", colour: "website" },
      { slug: "etsy-and-handmade", name: "Etsy and handmade", colour: "etsy" },
      { slug: "tiktok-shop", name: "TikTok Shop", colour: "website" },
      { slug: "own-website-and-shopify", name: "Own website and Shopify", colour: "website" },
    ],
  },
  {
    slug: "reselling",
    name: "Reselling in general",
    colour: "general",
    children: [
      { slug: "sourcing-and-stock", name: "Sourcing and stock", colour: "general", min_account_age_hours: 24, description: "Car boots, charity shops, auctions, wholesale, liquidation." },
      { slug: "tax-bookkeeping-and-legal", name: "Tax, bookkeeping and legal", colour: "general" },
      { slug: "tools-and-automation", name: "Tools and automation", colour: "general" },
      { slug: "multi-channel-selling", name: "Multi-channel selling", colour: "general" },
      { slug: "wins-and-case-studies", name: "Wins and case studies", colour: "general", min_account_age_hours: 24 },
      { slug: "introductions", name: "Introductions", colour: "general" },
      { slug: "site-feedback", name: "Site feedback", colour: "general" },
    ],
  },
  {
    slug: "ask-tom",
    name: "Ask Tom",
    colour: "general",
    accepting_topics: false,
    accepting_note: "[TOM: when the monthly window opens, e.g. the first week of every month]",
    description: "[TOM: what Ask Tom is: a monthly window where Tom answers questions in public]",
  },
];

async function authorId(): Promise<string> {
  const { data } = await supabase.auth.admin.listUsers({ perPage: 1000 });
  const user = data.users.find((u) => u.email?.toLowerCase() === authorEmail!.toLowerCase());
  if (!user) throw new Error(`No auth user with email ${authorEmail}. Sign up with it first.`);
  await supabase.from("profiles").update({ is_staff: true, trust_level: 4, onboarded_at: new Date().toISOString() }).eq("id", user.id);
  return user.id;
}

async function upsertCategory(cat: Cat, parentId: string | null, position: number): Promise<string> {
  const { data, error } = await supabase
    .from("categories")
    .upsert(
      {
        slug: cat.slug,
        name: cat.name,
        colour: cat.colour,
        position,
        parent_id: parentId,
        min_account_age_hours: cat.min_account_age_hours ?? 0,
        accepting_topics: cat.accepting_topics ?? true,
        accepting_note: cat.accepting_note ?? null,
        description: cat.description ?? `[TOM: one line describing ${cat.name}]`,
      },
      { onConflict: "slug" },
    )
    .select("id")
    .single();
  if (error) throw error;
  return data.id;
}

async function ensureIntroTopic(categoryId: string, categoryName: string, author: string) {
  const { data: existing } = await supabase.from("topics").select("id").eq("category_id", categoryId).eq("is_pinned", true).limit(1);
  if (existing && existing.length > 0) return;
  const { data: topic, error } = await supabase
    .from("topics")
    .insert({ title: `Read this first: ${categoryName}`, category_id: categoryId, author_id: author, is_pinned: true })
    .select("id")
    .single();
  if (error) throw error;
  await supabase.from("posts").insert({
    topic_id: topic.id,
    author_id: author,
    body_md: `[TOM: what belongs in ${categoryName}, what does not, and one or two examples of a good question here]`,
  });
}

async function loadCsv(file: string, fallbackAuthor: string) {
  const rows = parse(readFileSync(file, "utf8"), { columns: true, skip_empty_lines: true, trim: true }) as {
    category_slug: string;
    title: string;
    body_md: string;
    author_username?: string;
  }[];
  const { data: categories } = await supabase.from("categories").select("id, slug");
  const bySlug = new Map((categories ?? []).map((c) => [c.slug, c.id]));
  let loaded = 0;
  for (const row of rows) {
    const categoryId = bySlug.get(row.category_slug);
    if (!categoryId) {
      console.warn(`Skipping "${row.title}": unknown category ${row.category_slug}`);
      continue;
    }
    let author = fallbackAuthor;
    if (row.author_username) {
      const { data: p } = await supabase.from("profiles").select("id").eq("username", row.author_username.toLowerCase()).maybeSingle();
      if (p) author = p.id;
      else console.warn(`Author ${row.author_username} not found for "${row.title}", using ${authorEmail}`);
    }
    const { data: topic, error } = await supabase.from("topics").insert({ title: row.title, category_id: categoryId, author_id: author }).select("id").single();
    if (error) {
      console.warn(`Failed "${row.title}": ${error.message}`);
      continue;
    }
    await supabase.from("posts").insert({ topic_id: topic.id, author_id: author, body_md: row.body_md });
    loaded += 1;
  }
  console.log(`Loaded ${loaded} of ${rows.length} topics from ${file}`);
}

async function main() {
  const author = await authorId();
  let position = 0;
  for (const parent of launch) {
    position += 1;
    const parentId = await upsertCategory(parent, null, position);
    if (!parent.children || parent.children.length === 0) {
      await ensureIntroTopic(parentId, parent.name, author);
    }
    let childPosition = 0;
    for (const child of parent.children ?? []) {
      childPosition += 1;
      const childId = await upsertCategory(child, parentId, childPosition);
      await ensureIntroTopic(childId, child.name, author);
    }
  }
  console.log("Categories and intro topics are in place.");

  // Tools and automation gets its pinned "when to automate" topic linking the Autopilot waitlist.
  const { data: tools } = await supabase.from("categories").select("id").eq("slug", "tools-and-automation").single();
  if (tools) {
    const { data: existing } = await supabase.from("topics").select("id").eq("category_id", tools.id).ilike("title", "When to automate%").limit(1);
    if (!existing || existing.length === 0) {
      const { data: t } = await supabase.from("topics").insert({ title: "When to automate", category_id: tools.id, author_id: author, is_pinned: true }).select("id").single();
      if (t) await supabase.from("posts").insert({ topic_id: t.id, author_id: author, body_md: "[TOM: when doing it by hand stops making sense, and what Autopilot does]\n\n[Join the Autopilot waitlist](/autopilot)" });
    }
  }

  const csvIndex = process.argv.indexOf("--csv");
  if (csvIndex !== -1 && process.argv[csvIndex + 1]) {
    await loadCsv(process.argv[csvIndex + 1], author);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
