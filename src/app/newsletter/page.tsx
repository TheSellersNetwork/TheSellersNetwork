import type { Metadata } from "next";
import Link from "next/link";
import { EmailSignupCard } from "@/components/marketing/email-signup-card";
import { getIssues } from "@/lib/forum/home-queries";
import { longDate } from "@/lib/format";
import { getPolicyChanges, platformLabels } from "@/lib/tools/changes";

export const metadata: Metadata = {
  title: "Newsletter",
  description: "Seller news, fee changes and the best of the forum. Read past issues.",
  alternates: { canonical: "/newsletter" },
};

export default async function NewsletterPage() {
  const issues = await getIssues();
  const changes = getPolicyChanges().slice(0, 3);
  return (
    <main id="main" className="mx-auto w-full max-w-3xl flex-1 px-4 py-10 sm:px-6">
      <h1 className="text-3xl font-semibold tracking-tight">Newsletter</h1>
      <p className="mt-2 text-muted-foreground">Seller news, fee changes and the best of the forum. Every issue is here to read before you decide.</p>
      <div className="mt-8">
        <EmailSignupCard source="/newsletter" variant="inline" />
      </div>
      <section aria-labelledby="changes-heading" className="mt-12">
        <div className="flex items-baseline justify-between gap-3">
          <h2 id="changes-heading" className="text-lg font-semibold">
            Latest fee and policy changes
          </h2>
          <Link href="/tools/policy-changes" className="text-sm underline">
            See them all
          </Link>
        </div>
        <ul className="mt-3 space-y-3">
          {changes.map((c) => (
            <li key={`${c.date}-${c.title}`} className="rounded-lg border bg-card p-4">
              <p className="text-xs text-muted-foreground">
                {longDate(`${c.date}T12:00:00Z`).split(" at")[0]} · {platformLabels[c.platform]}
              </p>
              <a href={c.url} target="_blank" rel="noopener" className="font-semibold hover:underline">
                {c.title}
              </a>
              <p className="mt-1 text-sm text-muted-foreground">{c.summary}</p>
            </li>
          ))}
        </ul>
      </section>
      <h2 className="mt-12 text-lg font-semibold">Past issues</h2>
      {issues.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">The first issue has not gone out yet. Subscribe above and you will get it.</p>
      ) : (
        <ul className="mt-3 divide-y rounded-lg border bg-card">
          {issues.map((i) => (
            <li key={i.id} className="p-4">
              <Link href={`/newsletter/${i.slug}`} className="font-semibold hover:underline">
                {i.subject}
              </Link>
              <p className="mt-0.5 text-xs text-muted-foreground">{longDate(i.sent_at).split(" at")[0]}</p>
              {i.preview_text ? <p className="mt-1 text-sm text-muted-foreground">{i.preview_text}</p> : null}
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
