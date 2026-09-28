/*
  Checks every guide in content/guides (and blog posts in content/blog) against
  docs/guide-style.md: frontmatter, house style, no raw HTML, safe links, known
  forum slugs and components. Run with `npm run guides:check`.
  Pass file names to check only those: `npm run guides:check -- vinted-bundles.mdx`.
*/

import { readdirSync, readFileSync, existsSync } from "node:fs";
import path from "node:path";
import matter from "gray-matter";

const root = process.cwd();
const forums = new Set([
  "ebay", "ebay-listings-and-titles", "ebay-pricing-and-offers", "ebay-postage-and-packaging", "ebay-buyers-and-disputes", "ebay-account-health-and-policy",
  "ebay-promoted-listings-and-traffic", "amazon", "amazon-fba-and-fbm", "amazon-listings-and-content", "amazon-ads-and-ppc", "amazon-account-health-and-suspensions",
  "amazon-sourcing-and-wholesale", "vinted", "facebook-marketplace", "live-selling", "whatnot", "ebay-live", "tiktok-live-and-other", "running-a-show", "other-platforms",
  "depop-and-clothing-resale", "etsy-and-handmade", "tiktok-shop", "own-website-and-shopify", "reselling", "sourcing-and-stock", "tax-bookkeeping-and-legal",
  "tools-and-automation", "multi-channel-selling", "wins-and-case-studies", "weekly-threads", "deals", "show-your-setup", "rate-my-listing", "real-or-fake", "scam-watch", "diaries-and-challenges", "amazon-claims-log",
]);
const components = new Set(["Signup", "Download", "TaxDates", "PerUnitCalculator", "PercentCalculator", "OperatorDetails"]);
const banned = ["unlock", "leverage", "supercharge", "game changer", "game-changer", "ultimate", "secret", "seamless", "delve"];

const only = process.argv.slice(2).filter((a) => a.endsWith(".mdx"));
let problems = 0;
let checked = 0;
const fail = (file, msg) => {
  problems += 1;
  console.log(`  ${file}: ${msg}`);
};

for (const dir of ["guides", "blog"]) {
  const full = path.join(root, "content", dir);
  if (!existsSync(full)) continue;
  for (const file of readdirSync(full).filter((f) => f.endsWith(".mdx") && !f.startsWith("_"))) {
    if (only.length && !only.includes(file)) continue;
    checked += 1;
    const raw = readFileSync(path.join(full, file), "utf8");
    let parsed;
    try {
      parsed = matter(raw);
    } catch (error) {
      fail(file, `frontmatter does not parse: ${error.message}`);
      continue;
    }
    const { data, content } = parsed;
    // Unpublished blog drafts are not checked until they get a date.
    if (dir === "blog" && !data.published) {
      checked -= 1;
      continue;
    }
    if (!data.title) fail(file, "missing title");
    if (!data.excerpt) fail(file, "missing excerpt");
    if (!data.published) fail(file, "missing published date");
    if (dir === "guides") {
      if (!Array.isArray(data.categories) || data.categories.length === 0) fail(file, "missing categories");
      for (const c of data.categories ?? []) if (!forums.has(c)) fail(file, `unknown category ${c}`);
    }
    if (raw.includes("—")) fail(file, "contains an em dash");
    const outsideCode = content.replace(/```[\s\S]*?```/g, "").replace(/`[^`]*`/g, "");
    const prose = outsideCode.replace(/<[A-Z][^>]*\/>/g, "").replace(/\]\([^)]*\)/g, "]");
    if (/!(?![\[=])/.test(prose)) fail(file, "contains an exclamation mark");
    const noLinks = raw.replace(/https?:\/\/\S+/g, "");
    for (const w of banned) if (new RegExp(`\\b${w}\\b`, "i").test(noLinks)) fail(file, `banned word "${w}"`);
    if (/\bTom\b|\[TOM:/.test(raw)) fail(file, "mentions a personal name or placeholder");
    if (/<[a-z][a-z0-9-]*[\s/>]/.test(outsideCode)) fail(file, "raw HTML is not allowed; use markdown");
    if (/^\s*(import|export)\s/m.test(outsideCode)) fail(file, "imports and exports are not allowed");
    for (const m of content.matchAll(/<([A-Z]\w*)/g)) if (!components.has(m[1])) fail(file, `unknown component ${m[1]}`);
    for (const m of content.matchAll(/\]\(([^)\s]+)/g)) {
      if (!/^(https:\/\/|\/|#|mailto:)/.test(m[1])) fail(file, `link must be https, a site path or an anchor: ${m[1]}`);
    }
    if (dir === "guides" && !/<Signup source="\/guides\//.test(content)) fail(file, "missing the closing <Signup /> line");
    const words = content.split(/\s+/).filter(Boolean).length;
    if (words < 700) fail(file, `only ${words} words`);
  }
}

console.log(problems === 0 ? `All ${checked} guides and posts pass.` : `\n${problems} problem(s) in ${checked} files.`);
process.exit(problems === 0 ? 0 : 1);
