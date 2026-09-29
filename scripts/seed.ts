/*
  Seeds the launch categories with short descriptions and a pinned
  "Read this first" topic in each, then optionally loads the owner's seed topics
  from a CSV. Idempotent: existing categories are updated by slug and intro
  topics are not duplicated.

  Usage:
    npm run seed                       categories and intro topics
    npm run seed -- --csv path.csv     also load topics from the CSV

  Needs SUPABASE_SERVICE_ROLE_KEY and SEED_AUTHOR_EMAIL (the owner's account) in .env.local.
  CSV columns: category_slug,title,body_md,author_username
  Nothing here invents content. Intro topics are short, neutral and editable.
*/

import { config } from "dotenv";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { randomBytes } from "node:crypto";
import { parse } from "csv-parse/sync";
import { createClient } from "@supabase/supabase-js";
import { findUserByEmail } from "./find-user";
import { rituals } from "../src/lib/rituals";

config({ path: ".env.local" });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const authorEmail = process.env.SEED_AUTHOR_EMAIL;
if (!url || !key) throw new Error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required");
if (!authorEmail) throw new Error("SEED_AUTHOR_EMAIL (the owner's account email) is required");

const supabase = createClient(url, key, { auth: { persistSession: false } });

type Cat = { slug: string; name: string; colour: string; children?: Cat[]; min_account_age_hours?: number; description?: string; accepting_topics?: boolean; accepting_note?: string; layout?: "list" | "deals" | "gallery"; allow_anonymous?: boolean };

/* Launch categories: four platforms at top level, then Other platforms, then general. */
const descriptions: Record<string, string> = {"ebay": "Selling on eBay UK, from your first listing to running a shop.", "ebay-listings-and-titles": "Titles, item specifics, photos and descriptions.", "ebay-pricing-and-offers": "Pricing from sold comps, Best Offer, watcher offers and sales.", "ebay-postage-and-packaging": "Royal Mail, couriers, packaging and postage pricing.", "ebay-buyers-and-disputes": "Returns, cases, INR claims, feedback and difficult buyers.", "ebay-account-health-and-policy": "Defects, VeRO, policy changes and account limits.", "ebay-promoted-listings-and-traffic": "Promoted Listings, views, impressions and getting seen.", "amazon": "Selling on Amazon UK, FBA and FBM.", "amazon-fba-and-fbm": "Prep, shipments, fees, storage and fulfilment choices.", "amazon-listings-and-content": "Listings, images, A+ content and catalogue problems.", "amazon-ads-and-ppc": "Sponsored ads, budgets, keywords and reading the reports.", "amazon-account-health-and-suspensions": "Account health, suspensions, appeals and verification.", "amazon-sourcing-and-wholesale": "Finding stock, wholesale accounts and ungating.", "vinted": "Selling on Vinted: listings, pricing, postage and buyers.", "facebook-marketplace": "Facebook Marketplace and local selling: listings, collection and payment.", "live-selling": "Selling live on Whatnot, eBay Live, TikTok Live and other streams.", "whatnot": "Whatnot shows, auctions, fees and shipping.", "ebay-live": "eBay Live streams and how they work.", "tiktok-live-and-other": "TikTok Live, Instagram Live and other live platforms.", "other-platforms": "Depop, Etsy, TikTok Shop, your own website and everything else.", "depop-and-clothing-resale": "Depop and clothing resale: listings, offers and shipping.", "etsy-and-handmade": "Etsy, handmade and print on demand.", "tiktok-shop": "TikTok Shop: setting up, listing, affiliates and fulfilment.", "own-website-and-shopify": "Your own website, Shopify and taking payments directly.", "reselling": "Everything that applies whatever platform you sell on.", "tax-bookkeeping-and-legal": "Tax, bookkeeping, VAT and business structure. Experience, not advice.", "tools-and-automation": "Listing tools, repricers, spreadsheets and what to automate.", "multi-channel-selling": "Selling the same stock on more than one platform.", "wins-and-case-studies": "What you sold, what you paid, what you made. Real numbers.", "introductions": "Say hello and tell us what you sell.", "site-feedback": "Bugs, ideas and requests for the forum itself."};

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
      { slug: "ebay-account-health-and-policy", name: "Account health and policy", colour: "ebay", allow_anonymous: true },
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
      { slug: "amazon-account-health-and-suspensions", name: "Account health and suspensions", colour: "amazon", allow_anonymous: true },
      { slug: "amazon-sourcing-and-wholesale", name: "Sourcing and wholesale", colour: "amazon" },
      { slug: "amazon-claims-log", name: "Claims and reimbursements log", colour: "amazon", description: "What you claimed for lost, damaged or returned stock, what Amazon said, and how long it took. Evidence for everyone." },
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
      { slug: "weekly-threads", name: "Weekly threads", colour: "general", description: "Monday numbers, Wednesday what would you pay, Friday wins. Posted every week, open to everyone." },
      { slug: "deals", name: "Deals and fee changes", colour: "general", layout: "deals", description: "Postage deals, packaging bulk buys, fee and policy changes. Vote still valid or expired." },
      { slug: "show-your-setup", name: "Show your setup", colour: "general", layout: "gallery", description: "Your packing station, storage and workspace. One photo minimum." },
      { slug: "rate-my-listing", name: "Rate my listing", colour: "general", description: "Post a listing or a screenshot and get honest feedback on the title, photos and price. If you critique, suggest a fix." },
      { slug: "real-or-fake", name: "Real or fake?", colour: "general", description: "Photos of labels, tags, stitching and boxes for a second opinion. Opinions here are not authentication." },
      { slug: "scam-watch", name: "Scam watch", colour: "general", description: "Scam messages and tactics doing the rounds right now. Blur names, usernames, order numbers and addresses before posting." },
      { slug: "diaries-and-challenges", name: "Diaries and challenges", colour: "general", description: "Keep a seller diary, set a goal, join a challenge. Goals every Monday, results on the 1st of the month." },
      { slug: "introductions", name: "Introductions", colour: "general" },
      { slug: "site-feedback", name: "Site feedback", colour: "general" },
    ],
  },
  {
    slug: "ask-the-team",
    name: "Ask the team",
    colour: "general",
    accepting_topics: false,
    accepting_note: "The next window opens on the first Monday of the month.",
    description: "A monthly window where the team answers your questions in public.",
  },
];

async function authorId(): Promise<string> {
  const user = await findUserByEmail(supabase, authorEmail!);
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
        layout: cat.layout ?? "list",
        allow_anonymous: cat.allow_anonymous ?? false,
        description: cat.description ?? descriptions[cat.slug] ?? null,
      },
      { onConflict: "slug" },
    )
    .select("id")
    .single();
  if (error) throw error;
  return data.id;
}

function introBody(categoryName: string, slug: string): string {
  const what = descriptions[slug] ? ` ${descriptions[slug]}` : "";
  return `Welcome to ${categoryName}.${what}\n\nStart a new topic for each question. Say what you tried and what happened, and include the numbers if you have them.\n\nThe [house rules](/community/rules) apply here as everywhere: be useful, no selling, real numbers welcome.`;
}

async function ensureIntroTopic(categoryId: string, categoryName: string, author: string, slug: string) {
  const { data: existing } = await supabase.from("topics").select("id").eq("category_id", categoryId).eq("is_pinned", true).ilike("title", "Read this first%").limit(1);
  if (existing && existing.length > 0) {
    // Refresh any intro still holding an old placeholder.
    await supabase.from("posts").update({ body_md: introBody(categoryName, slug), body_html: null }).eq("topic_id", existing[0].id).eq("post_number", 1).like("body_md", "[TOM:%");
    return;
  }
  const { data: topic, error } = await supabase
    .from("topics")
    .insert({ title: `Read this first: ${categoryName}`, category_id: categoryId, author_id: author, is_pinned: true })
    .select("id")
    .single();
  if (error) throw error;
  await supabase.from("posts").insert({
    topic_id: topic.id,
    author_id: author,
    body_md: introBody(categoryName, slug),
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
      // Only staff accounts can be named: posting in a member's name without their consent would put words in their mouth.
      const { data: p } = await supabase.from("profiles").select("id, is_staff").eq("username", row.author_username.toLowerCase()).maybeSingle();
      if (p && !p.is_staff) {
        console.warn(`Skipping "${row.title}": ${row.author_username} is not a staff account`);
        continue;
      }
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

/*
  The shared "Anonymous member" account that anonymous posts are written as.
  It never signs in: no password anyone knows, never onboarded, so it never
  shows among members. Created once, then found by its site_accounts row.
*/
async function ensureAnonymousAccount() {
  const { data: existing } = await supabase.from("site_accounts").select("profile_id").eq("key", "anonymous").maybeSingle();
  if (existing) return;
  const { data, error } = await supabase.auth.admin.createUser({
    email: "anonymous-member@example.com",
    password: randomBytes(32).toString("base64url"),
    email_confirm: true,
    user_metadata: { username: "anonymous_member", display_name: "Anonymous member" },
  });
  if (error || !data.user) throw error ?? new Error("Could not create the anonymous account.");
  await supabase.from("profiles").update({ username: "anonymous_member", display_name: "Anonymous member" }).eq("id", data.user.id);
  const { error: linkError } = await supabase.from("site_accounts").insert({ key: "anonymous", profile_id: data.user.id });
  if (linkError) throw linkError;
  console.log("Anonymous member account created.");
}

/* Shared accounts the site writes as: "deleted" holds posts from members who deleted their account. */
async function ensureSiteAccount(key: string, username: string, displayName: string): Promise<string> {
  const { data: existing } = await supabase.from("site_accounts").select("profile_id").eq("key", key).maybeSingle();
  if (existing) return existing.profile_id as string;
  const { data, error } = await supabase.auth.admin.createUser({
    email: `${username.replace(/_/g, "-")}@example.com`,
    password: randomBytes(32).toString("base64url"),
    email_confirm: true,
    user_metadata: { username, display_name: displayName },
  });
  if (error || !data.user) throw error ?? new Error(`Could not create the ${key} account.`);
  await supabase.from("profiles").update({ username, display_name: displayName }).eq("id", data.user.id);
  const { error: linkError } = await supabase.from("site_accounts").insert({ key, profile_id: data.user.id });
  if (linkError) throw linkError;
  console.log(`${displayName} account created.`);
  return data.user.id;
}

/*
  The house account, "The Sellers Network". A clearly labelled staff account
  (shown as Team) that posts the intro topics, recurring threads, discussion
  starters and fee change threads, so no one's personal account does. It never
  signs in and is never onboarded, so it does not appear among members.
  Needs migration 20260928002300; without it the seed carries on as before.
*/
async function ensureHouseAccount(): Promise<string | null> {
  try {
    const id = await ensureSiteAccount("house", "the_sellers_network", "The Sellers Network");
    await supabase
      .from("profiles")
      .update({ is_staff: true, trust_level: 4, bio: "The site's own account, run by the team. It posts the weekly threads, discussion starters and fee change threads. It is not a member and does not answer questions as one." })
      .eq("id", id);
    return id;
  } catch (error) {
    console.log(`House account skipped (${error instanceof Error ? error.message : String(error)}). Apply migration 20260928002300_house_account.sql, then run the seed again.`);
    return null;
  }
}

/* Moves the site's own threads (intro topics, recurring threads, change threads) from the staff account to the house account. */
async function adoptSiteThreads(from: string, to: string) {
  const prefixes = ["Read this first:", "When to automate", ...rituals.map((r) => r.titlePrefix)];
  const changeDir = path.join(process.cwd(), "content", "changes");
  const discussions = readdirSync(changeDir)
    .filter((f) => f.endsWith(".mdx"))
    .map((f) => readFileSync(path.join(changeDir, f), "utf8").match(/^discussion:\s*"?([A-Za-z0-9_-]+)"?\s*$/m)?.[1])
    .filter((id): id is string => Boolean(id));

  const { data: topics } = await supabase.from("topics").select("id, title, short_id, last_poster_id, reply_count").eq("author_id", from);
  const mine = (topics ?? []).filter((t) => prefixes.some((p) => String(t.title).startsWith(p)) || discussions.includes(String(t.short_id)));
  for (const t of mine) {
    await supabase.from("topics").update({ author_id: to, ...(t.last_poster_id === from && t.reply_count === 0 ? { last_poster_id: to } : {}) }).eq("id", t.id);
    await supabase.from("posts").update({ author_id: to }).eq("topic_id", t.id).eq("post_number", 1).eq("author_id", from);
  }
  if (mine.length) console.log(`Moved ${mine.length} site thread(s) to The Sellers Network account.`);
}

async function main() {
  const staff = await authorId();
  await ensureAnonymousAccount();
  await ensureSiteAccount("deleted", "deleted_member", "Deleted member");
  const house = await ensureHouseAccount();
  if (house) await adoptSiteThreads(staff, house);
  const author = house ?? staff;
  let position = 0;
  for (const parent of launch) {
    position += 1;
    const parentId = await upsertCategory(parent, null, position);
    if (!parent.children || parent.children.length === 0) {
      await ensureIntroTopic(parentId, parent.name, author, parent.slug);
    }
    let childPosition = 0;
    for (const child of parent.children ?? []) {
      childPosition += 1;
      const childId = await upsertCategory(child, parentId, childPosition);
      await ensureIntroTopic(childId, child.name, author, child.slug);
    }
  }
  console.log("Categories and intro topics are in place.");

  // The "Ask Tom" forum was renamed "Ask the team"; rename any intro topic still carrying the old name.
  const { data: oldTitles } = await supabase.from("topics").select("id, title").ilike("title", "%Ask Tom%");
  for (const t of oldTitles ?? []) {
    await supabase.from("topics").update({ title: String(t.title).replace(/Ask Tom/g, "Ask the team") }).eq("id", t.id);
  }
  if (oldTitles?.length) console.log(`Renamed ${oldTitles.length} topic(s) from Ask Tom to Ask the team.`);

  // Tools and automation gets its pinned "when to automate" topic linking the Autopilot waitlist.
  const { data: tools } = await supabase.from("categories").select("id").eq("slug", "tools-and-automation").single();
  if (tools) {
    const { data: existing } = await supabase.from("topics").select("id").eq("category_id", tools.id).ilike("title", "When to automate%").limit(1);
    if (!existing || existing.length === 0) {
      const { data: t } = await supabase.from("topics").insert({ title: "When to automate", category_id: tools.id, author_id: author, is_pinned: true }).select("id").single();
      if (t) await supabase.from("posts").insert({ topic_id: t.id, author_id: author, body_md: "This pinned topic is for one question: when does doing it by hand stop making sense? Share where you are, how many listings, how many hours a week, and what you would hand off first." });
    } else {
      await supabase.from("posts").update({ body_md: "This pinned topic is for one question: when does doing it by hand stop making sense? Share where you are, how many listings, how many hours a week, and what you would hand off first.", body_html: null }).eq("topic_id", existing[0].id).eq("post_number", 1).like("body_md", "[TOM:%");
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
