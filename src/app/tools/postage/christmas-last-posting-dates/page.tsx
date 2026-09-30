import type { Metadata } from "next";
import Link from "next/link";
import postingData from "../../../../../content/christmas-posting.json";
import { ChristmasCountdown } from "@/components/tools/christmas-countdown";
import { ToolHeader } from "@/components/tools/tool-header";
import { EmailSignupCard } from "@/components/marketing/email-signup-card";
import { BreadcrumbJsonLd } from "@/components/seo/json-ld";
import { siteConfig } from "@/lib/site";
import { christmasPostingPage, cutOffs, formatPostingDate, publishedTips, readPostingData } from "@/lib/tools/christmas-posting";

/*
  One permanent URL, refreshed each year by editing content/christmas-posting.json.
  No FAQ JSON-LD: there is no finished FAQ copy to match it yet.
*/

const data = readPostingData(postingData);
const p = christmasPostingPage(data);

export const metadata: Metadata = {
  title: { absolute: p.title },
  description: p.description,
  alternates: { canonical: p.path },
  openGraph: { title: p.title, description: p.description, url: p.path, siteName: siteConfig.name, locale: "en_GB", type: "website" },
  twitter: { card: "summary_large_image", title: p.title, description: p.description },
};

// Rebuilt at least daily so the countdown's starting point stays close; the browser keeps it current after that.
export const revalidate = 86400;

const hostname = (url: string) => new URL(url).hostname.replace(/^www\./, "");

export default async function ChristmasPostingPage() {
  const serverNow = new Date().getTime();
  const tips = publishedTips(data);
  const checked = data.checked ? formatPostingDate(data.checked, false) : null;

  return (
    <main id="main" className="mx-auto w-full max-w-4xl flex-1 px-4 py-10 sm:px-6">
      <BreadcrumbJsonLd
        items={[
          { name: "Tools", url: "/tools" },
          { name: "Postage finder", url: "/tools/postage" },
          { name: p.h1, url: p.path },
        ]}
      />
      <ToolHeader title={p.h1} intro={p.intro} parent={{ href: "/tools/postage", label: "Postage finder" }}>
        {checked ? <p className="mt-2 text-sm text-muted-foreground">Correct as of {checked}.</p> : null}
      </ToolHeader>

      <ChristmasCountdown cutOffs={cutOffs(data)} year={data.year} serverNow={serverNow} />

      <section aria-labelledby="dates-heading" className="mt-12">
        <h2 id="dates-heading" className="text-xl font-semibold tracking-tight">
          Last recommended posting dates by carrier
        </h2>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          These are the carriers&rsquo; own last recommended dates for delivery within the UK before Christmas. Post before the last collection on the day. Where a carrier has not announced its {data.year} dates yet, the link goes to the page where they will appear.
        </p>
        <div className="mt-6 space-y-8">
          {data.carriers.map((c) => (
            <div key={c.id} data-testid={`carrier-${c.id}`}>
              <h3 className="font-semibold">{c.name}</h3>
              {c.note ? <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{c.note}</p> : null}
              <div className="mt-3 overflow-x-auto rounded-xl border bg-card">
                <table className="w-full table-fixed text-left text-sm">
                  <caption className="sr-only">
                    {c.name} last recommended posting dates for Christmas {data.year}
                  </caption>
                  <thead className="border-b text-xs uppercase tracking-wide text-muted-foreground">
                    <tr>
                      <th scope="col" className="w-3/5 px-4 py-2 font-medium">
                        Service
                      </th>
                      <th scope="col" className="px-4 py-2 font-medium">
                        Last posting date
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {c.services.map((s) => (
                      <tr key={s.id}>
                        <th scope="row" className="px-4 py-3 align-top font-medium">
                          {s.name}
                          {s.note ? <span className="mt-0.5 block text-xs font-normal text-muted-foreground">{s.note}</span> : null}
                        </th>
                        <td className="px-4 py-3 align-top">
                          {s.date ? (
                            <>
                              <span className="font-medium">{formatPostingDate(s.date)}</span>
                              <a href={s.source} className="mt-0.5 block text-xs text-muted-foreground underline" rel="noopener noreferrer" target="_blank">
                                Source: {hostname(s.source)}
                              </a>
                            </>
                          ) : (
                            <>
                              <span className="text-muted-foreground">Not announced yet</span>
                              <a href={s.source} className="mt-0.5 block text-xs underline" rel="noopener noreferrer" target="_blank">
                                Check {c.name}&rsquo;s page<span className="sr-only"> for {s.name}</span>
                              </a>
                            </>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
        <p className="mt-4 text-sm text-muted-foreground">
          Dates are only added once the carrier publishes them on its own website or in its own press release. Last posting dates are recommendations, not guarantees, and they can change, so check the carrier&rsquo;s page before you promise a buyer a date.
        </p>
      </section>

      {data.platforms.length > 0 ? (
        <section aria-labelledby="platforms-heading" className="mt-12">
          <h2 id="platforms-heading" className="text-xl font-semibold tracking-tight">
            What the marketplaces say
          </h2>
          <ul className="mt-4 grid gap-3 md:grid-cols-2">
            {data.platforms.map((pl) => (
              <li key={pl.id} className="rounded-xl border bg-card p-4 text-sm">
                <h3 className="font-semibold">{pl.name}</h3>
                <p className="mt-1 text-muted-foreground">{pl.note}</p>
                <a href={pl.source} className="mt-2 inline-block text-xs underline" rel="noopener noreferrer" target="_blank">
                  Source: {hostname(pl.source)}
                </a>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {tips.length > 0 ? (
        <section aria-labelledby="tips-heading" className="mt-12">
          <h2 id="tips-heading" className="text-xl font-semibold tracking-tight">
            Tips for Christmas orders
          </h2>
          <ul className="mt-4 list-disc space-y-2 pl-5 text-sm text-muted-foreground">
            {tips.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
        </section>
      ) : null}

      <section aria-labelledby="postage-tools" className="mt-12">
        <h2 id="postage-tools" className="text-xl font-semibold tracking-tight">
          Get parcels out in time
        </h2>
        <ul className="mt-4 grid gap-3 sm:grid-cols-2">
          <li className="rounded-xl border bg-card p-4 text-sm">
            <Link href="/tools/postage" className="font-medium underline">
              Cheapest postage service
            </Link>
            <p className="mt-1 text-muted-foreground">Enter the packed size and weight to find the cheapest Royal Mail or Evri service.</p>
          </li>
          <li className="rounded-xl border bg-card p-4 text-sm">
            <Link href="/tools/postage?tab=size" className="font-medium underline">
              Parcel size checker
            </Link>
            <p className="mt-1 text-muted-foreground">Every Royal Mail, Evri and Parcelforce service your parcel fits.</p>
          </li>
          <li className="rounded-xl border bg-card p-4 text-sm">
            <Link href="/tools/label-cropper" className="font-medium underline">
              Shipping label cropper
            </Link>
            <p className="mt-1 text-muted-foreground">Crop A4 label PDFs to 4x6, A6 or A4 sheets, one label or a whole batch.</p>
          </li>
          <li className="rounded-xl border bg-card p-4 text-sm">
            <Link href="/tools/vinted-label-cropper" className="font-medium underline">
              Vinted label cropper
            </Link>
            <p className="mt-1 text-muted-foreground">Print Vinted Evri and InPost labels on a thermal printer.</p>
          </li>
        </ul>
        <p className="mt-4 text-sm text-muted-foreground">
          Every known cut-off is also in the{" "}
          <Link href="/tools/calendar" className="underline">
            reseller calendar
          </Link>
          , which you can add to Google, Apple or Outlook.
        </p>
      </section>

      <EmailSignupCard source={p.path} className="mt-12 max-w-xl" />
    </main>
  );
}
