/*
  Checks every change breakdown in content/changes against docs/change-style.md:
  required frontmatter, allowed values, the house style rules, and that
  calculators and forum slugs are valid. Run with `npm run changes:check`.
*/

import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import matter from "gray-matter";

const dir = path.join(process.cwd(), "content", "changes");
const guidesDir = path.join(process.cwd(), "content", "guides");
const guides = new Set(readdirSync(guidesDir).map((f) => f.replace(/\.mdx$/, "")));

const platforms = ["ebay", "amazon", "vinted", "etsy", "depop", "tiktok-shop", "royal-mail", "evri", "hmrc", "general"];
const forums = [
  "ebay-listings-and-titles", "ebay-pricing-and-offers", "ebay-postage-and-packaging", "ebay-buyers-and-disputes", "ebay-account-health-and-policy",
  "amazon-fba-and-fbm", "amazon-listings-and-content", "amazon-account-health-and-suspensions", "amazon-sourcing-and-wholesale",
  "vinted", "facebook-marketplace", "depop-and-clothing-resale", "etsy-and-handmade", "tiktok-shop", "tax-bookkeeping-and-legal", "multi-channel-selling", "deals",
];
const banned = ["unlock", "leverage", "supercharge", "game changer", "game-changer", "ultimate", "secret", "seamless", "delve"];
const headings = ["The short version", "Who it affects", "What changed", "What it means for your money", "What to do now", "Key dates"];

let problems = 0;
const fail = (file, msg) => {
  problems += 1;
  console.log(`  ${file}: ${msg}`);
};

const files = readdirSync(dir).filter((f) => f.endsWith(".mdx") && !f.startsWith("_"));
for (const file of files) {
  const raw = readFileSync(path.join(dir, file), "utf8");
  let parsed;
  try {
    parsed = matter(raw);
  } catch (error) {
    fail(file, `frontmatter does not parse: ${error.message}`);
    continue;
  }
  const { data, content } = parsed;
  for (const key of ["title", "platform", "date", "status", "impact", "affects", "summary", "source", "forum", "questions", "author"]) {
    if (data[key] === undefined || data[key] === "") fail(file, `missing ${key}`);
  }
  if (data.platform && !platforms.includes(data.platform)) fail(file, `unknown platform ${data.platform}`);
  if (data.status && !["in-effect", "coming", "announced"].includes(data.status)) fail(file, `unknown status ${data.status}`);
  if (data.impact && !["high", "medium", "low"].includes(data.impact)) fail(file, `unknown impact ${data.impact}`);
  if (data.author && !["jamie-callaghan", "rachel-doyle"].includes(data.author)) fail(file, `unknown author ${data.author}`);
  if (data.forum && !forums.includes(data.forum)) fail(file, `unknown forum ${data.forum}`);
  if (data.source && !/^https:\/\//.test(String(data.source))) fail(file, "source must be an https link");
  if (String(data.title ?? "").length > 90) fail(file, "title over 90 characters");
  for (const g of data.guides ?? []) if (!guides.has(g)) fail(file, `unknown guide ${g}`);
  if (!Array.isArray(data.questions) || data.questions.length < 2) fail(file, "needs 2 or 3 questions");

  if (raw.includes("—")) fail(file, "contains an em dash");
  const prose = content.replace(/<[^>]+>/g, "").replace(/\]\([^)]*\)/g, "]").replace(/`[^`]*`/g, "");
  if (/!(?!\[)/.test(prose.replace(/!=/g, ""))) fail(file, "contains an exclamation mark");
  // Links can contain anything (press release URLs often do), so only check the words.
  const withoutLinks = raw.replace(/https?:\/\/\S+/g, "");
  for (const word of banned) if (new RegExp(`\\b${word}\\b`, "i").test(withoutLinks)) fail(file, `banned word "${word}"`);
  if (/\bTom\b/.test(raw)) fail(file, "mentions a personal name");
  for (const h of headings) if (!content.includes(`## ${h}`)) fail(file, `missing heading "## ${h}"`);
  for (const m of content.matchAll(/<(\w+Calculator)\b([^>]*)\/>/g)) {
    if (!["PerUnitCalculator", "PercentCalculator"].includes(m[1])) fail(file, `unknown component ${m[1]}`);
    if (!/before="-?[\d.]+"/.test(m[2]) || !/after="-?[\d.]+"/.test(m[2])) fail(file, `${m[1]} needs before="number" and after="number"`);
  }
  const unknown = [...content.matchAll(/<([A-Z]\w*)/g)].map((m) => m[1]).filter((n) => !["PerUnitCalculator", "PercentCalculator"].includes(n));
  if (unknown.length) fail(file, `unknown components: ${[...new Set(unknown)].join(", ")}`);
  // Raw HTML is stripped when rendering, but a post that contains it was written wrongly or tampered with.
  const outsideCode = content.replace(/```[\s\S]*?```/g, "").replace(/`[^`]*`/g, "");
  if (/<[a-z][a-z0-9-]*[\s/>]/.test(outsideCode)) fail(file, "raw HTML is not allowed; use markdown");
  if (/^\s*(import|export)\s/m.test(outsideCode)) fail(file, "imports and exports are not allowed");
  for (const s of data.sources ?? []) if (!/^https:\/\//.test(String(s?.url ?? ""))) fail(file, `source links must be https: ${s?.url}`);
  for (const m of content.matchAll(/\]\(([^)\s]+)/g)) {
    if (!/^(https:\/\/|\/|#|mailto:)/.test(m[1])) fail(file, `link must be https, a site path or an anchor: ${m[1]}`);
  }
}

console.log(problems === 0 ? `All ${files.length} change pages pass.` : `\n${problems} problem(s) in ${files.length} change pages.`);
process.exit(problems === 0 ? 0 : 1);
