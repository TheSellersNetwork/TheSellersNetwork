import type { Metadata } from "next";
import Link from "next/link";
import { ResellerCalendar } from "@/components/tools/reseller-calendar";
import { ToolHeader } from "@/components/tools/tool-header";
import { siteConfig } from "@/lib/site";
import { getCalendar } from "@/lib/tools/calendar";
import { toYmd } from "@/lib/tools/calendar-dates";

export const metadata: Metadata = {
  title: "Reseller calendar: releases, sales, fee changes and tax dates",
  description: "Pokémon and Lego release dates, big sale days, UK bank holidays, marketplace fee and policy changes and UK tax deadlines in one calendar. Every date links to its source, and you can add it to Google, Apple or Outlook.",
  alternates: { canonical: "/tools/calendar" },
};

// Rebuilt at least daily so new changes, feed updates and the date window stay current.
export const revalidate = 86400;

export default async function CalendarPage() {
  const now = new Date();
  const events = await getCalendar(now);
  const feedUrl = `${siteConfig.url.replace(/\/$/, "")}/tools/calendar/calendar.ics`;

  return (
    <main id="main" className="mx-auto w-full max-w-4xl flex-1 px-4 py-10 sm:px-6">
      <ToolHeader
        title="Reseller calendar"
        intro="Release dates, sale days, UK bank holidays, marketplace fee and policy changes and tax deadlines in one place. Every date comes from an official source or a fixed rule, and links to where it came from."
      />

      <ResellerCalendar events={events} serverToday={toYmd(now)} feedUrl={feedUrl} />

      <section className="mt-12 space-y-3 text-sm text-muted-foreground">
        <h2 className="text-lg font-semibold text-foreground">Where the dates come from</h2>
        <p>
          Pokémon and Lego dates come from The Pokémon Company and the LEGO Group&rsquo;s own announcements. Amazon sale dates appear only once Amazon has announced them. Black Friday, Cyber Monday and Boxing Day are worked out from their fixed rules. Bank holidays come from{" "}
          <a href="https://www.gov.uk/bank-holidays" target="_blank" rel="noopener" className="underline">
            GOV.UK
          </a>
          , tax dates from HMRC&rsquo;s published deadlines (see <Link href="/tools/tax" className="underline">tax dates and thresholds</Link>), and fee and policy changes from our{" "}
          <Link href="/blog?type=changes" className="underline">
            change tracker
          </Link>
          .
        </p>
        <p>
          <strong className="text-foreground">Lego retirements.</strong> LEGO rarely publishes retirement dates. Its{" "}
          <a href="https://www.lego.com/en-gb/categories/last-chance-to-buy" target="_blank" rel="noopener" className="underline">
            retiring soon
          </a>{" "}
          page lists sets that are going but gives no end dates. Retirement lists on other sites are predictions, however confident they sound, so we do not show them as dates here.
        </p>
        <p>
          Release dates can move. Check the source before you buy stock around one. Not financial or tax advice.
        </p>
        <p>
          Know an officially announced date we have missed? Post it in the{" "}
          <Link href="/community" className="underline">
            community
          </Link>{" "}
          with a link to the announcement. We only add dates with an official source.
        </p>
      </section>
    </main>
  );
}
