import "server-only";
import { getChanges } from "@/lib/content/changes";
import { getGuides } from "@/lib/content/guides";
import { getHeroTopics } from "@/lib/forum/live-queries";
import type { RecentTopic } from "@/lib/forum/overview-queries";
import { urls } from "@/lib/forum/urls";
import { displayName, timeAgo } from "@/lib/format";
import { gbp, multiple, pickupSources } from "@/lib/pickups";
import { getPickups } from "@/lib/pickups-queries";
import { platformLabels } from "@/lib/tools/changes";
import { toolGroups } from "@/lib/tools/catalogue";
import { daysUntil, upcomingTaxDates } from "@/lib/tools/tax";

export type SlideIcon = "question" | "guide" | "tool" | "numbers" | "pickup" | "change";

export type Slide = {
  key: string;
  /* Small label above the title, e.g. "Coming up · Royal Mail". */
  eyebrow: string;
  /* A short highlighted chip: "In 7 days", "14x", "No replies yet". */
  pill: string | null;
  /* Makes the pill blue: something happening soon or worth a look now. */
  urgent: boolean;
  title: string;
  detail: string | null;
  href: string;
  cta: string;
  visual: { kind: "date"; date: string } | { kind: "photo"; src: string | null } | { kind: "icon"; icon: SlideIcon };
};

type Dated = { key: string; date: string; days: number; title: string; summary: string; href: string; label: string };

const iso = (d: Date) => d.toISOString().slice(0, 10);
const utc = (s: string) => new Date(`${s}T00:00:00Z`);
const inDays = (days: number) => (days === 0 ? "Today" : days === 1 ? "Tomorrow" : `In ${days} days`);
const agoDays = (days: number) => (days < 14 ? `${days} days ago` : days < 60 ? `${Math.round(days / 7)} weeks ago` : `${Math.round(days / 30)} months ago`);

/* Tools worth a spotlight. One is chosen each day. */
const spotlightTools = ["/tools/where-to-sell", "/tools/scam-check", "/tools/profit-report", "/tools/listing-builder", "/tools/postage-finder", "/tools/stock-ageing", "/tools/isbn", "/tools/claims-deadline"];

/*
  The revolving card at the top of the home page. A mix of things worth a
  click: the next dated changes, the newest pickup, a question waiting for an
  answer, this week's numbers thread, a guide and a tool of the day, and the
  latest change already in effect. Everything is real data; a slide with
  nothing behind it is left out, or invites the first post instead.
*/
export async function getHeroSlides(unanswered: RecentTopic[], today = new Date()): Promise<Slide[]> {
  const [changes, guides, pickups, hero] = await Promise.all([getChanges(), getGuides(), getPickups({}, 1), getHeroTopics()]);
  const dayOfYear = Math.floor((Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()) - Date.UTC(today.getUTCFullYear(), 0, 0)) / 86_400_000);

  const dated: Dated[] = changes.map((c) => ({ key: c.slug, date: c.date, days: daysUntil(utc(c.date), today), title: c.title, summary: c.summary, href: `/blog/${c.slug}`, label: platformLabels[c.platform] ?? "Everyone" }));
  const taxes: Dated[] = upcomingTaxDates(today, 2, false).map((t) => ({ key: `tax-${iso(t.date)}`, date: iso(t.date), days: daysUntil(t.date, today), title: t.title, summary: t.detail, href: "/tools/tax-dates", label: "Tax" }));
  const upcoming = [...dated.filter((d) => d.days >= 0), ...taxes].sort((a, b) => a.days - b.days);
  const latestInEffect = dated.filter((d) => d.days < 0).sort((a, b) => b.days - a.days)[0];

  const dateSlide = (d: Dated): Slide => ({
    key: `date-${d.key}`,
    eyebrow: `Coming up · ${d.label}`,
    pill: inDays(d.days),
    urgent: d.days <= 7,
    title: d.title,
    detail: null,
    href: d.href,
    cta: d.href.startsWith("/blog") ? "What it means for you" : "All tax dates",
    visual: { kind: "date", date: d.date },
  });

  const slides: (Slide | null)[] = [];
  slides.push(upcoming[0] ? dateSlide(upcoming[0]) : null);

  const p = pickups[0];
  slides.push(
    p
      ? {
          key: `pickup-${p.id}`,
          eyebrow: `Latest pickup · ${pickupSources[p.source_type]}${p.area ? `, ${p.area}` : ""}`,
          pill: multiple(p.paid, p.sold_price),
          urgent: p.sold_price !== null,
          title: `${p.brand ? `${p.brand}: ` : ""}${p.title}`,
          detail: `Paid ${gbp(p.paid)}${p.sold_price !== null ? `, sold ${gbp(p.sold_price)}` : p.expected !== null ? `, hoping for ${gbp(p.expected)}` : ""}${p.author ? ` · ${displayName(p.author)}` : ""}`,
          href: `/community/pickups/${p.id}`,
          cta: "See the pickup",
          visual: { kind: "photo", src: p.photo_url },
        }
      : {
          key: "pickup-first",
          eyebrow: "Pickups",
          pill: null,
          urgent: false,
          title: "Found something good at a car boot? Show what you paid and what it sold for.",
          detail: null,
          href: "/community/pickups/new",
          cta: "Post a pickup",
          visual: { kind: "icon", icon: "pickup" },
        },
  );

  const q = unanswered[0];
  slides.push(
    q
      ? {
          key: `question-${q.id}`,
          eyebrow: "Can you answer this?",
          pill: "No replies yet",
          urgent: true,
          title: q.title,
          detail: `${displayName(q.author)} asked ${timeAgo(q.created_at)} ago`,
          href: urls.topic(q),
          cta: "Answer it",
          visual: { kind: "icon", icon: "question" },
        }
      : null,
  );

  const guide = guides.length ? guides[dayOfYear % guides.length] : null;
  slides.push(
    guide
      ? { key: `guide-${guide.slug}`, eyebrow: "Guide of the day", pill: null, urgent: false, title: guide.title, detail: guide.excerpt || null, href: urls.guide(guide.slug), cta: "Read the guide", visual: { kind: "icon", icon: "guide" } }
      : null,
  );

  slides.push(upcoming[1] ? dateSlide(upcoming[1]) : null);

  const allTools = toolGroups.flatMap((g) => g.tools);
  const toolHref = spotlightTools[dayOfYear % spotlightTools.length];
  const tool = allTools.find((t) => t.href === toolHref);
  slides.push(tool ? { key: `tool-${tool.href}`, eyebrow: "Free tool", pill: "No sign-up", urgent: false, title: tool.title, detail: tool.description, href: tool.href, cta: "Try it", visual: { kind: "icon", icon: "tool" } } : null);

  const weekly = hero.weekly;
  slides.push(
    weekly
      ? {
          key: `weekly-${weekly.id}`,
          eyebrow: "This week's numbers",
          pill: weekly.reply_count > 0 ? `${weekly.reply_count} posted` : null,
          urgent: false,
          title: weekly.title,
          detail: "What you listed, what sold and what you made. Real numbers, no bragging.",
          href: urls.topic(weekly),
          cta: weekly.reply_count > 0 ? "Read and post yours" : "Be the first to post",
          visual: { kind: "icon", icon: "numbers" },
        }
      : null,
  );

  slides.push(
    latestInEffect
      ? {
          key: `effect-${latestInEffect.key}`,
          eyebrow: `Now in effect · ${latestInEffect.label}`,
          pill: agoDays(-latestInEffect.days),
          urgent: false,
          title: latestInEffect.title,
          detail: null,
          href: latestInEffect.href,
          cta: "What changed",
          visual: { kind: "icon", icon: "change" },
        }
      : null,
  );

  return slides.filter((s): s is Slide => s !== null);
}
