import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { EmailSignupCard } from "@/components/marketing/email-signup-card";

/*
  Placeholder marketing pages so nothing in the header or footer 404s before
  the week 2 tasks build them properly. Each is a title and a [TOM: ...] note.
*/
const pages: Record<string, { title: string; description: string; note: string }> = {
  mentoring: { title: "Mentoring", description: "Group and one-to-one mentoring for UK resellers.", note: "group and one-to-one mentoring, pricing table, Cal.com booking (mentoring Phase 3)" },
  course: { title: "The course", description: "The self-paced course for UK resellers.", note: "course sales page, 8 modules, Stripe checkout (mentoring Phase 2)" },
  autopilot: { title: "Autopilot", description: "Hands-off reselling, explained.", note: "Autopilot explainer and waitlist (week 2)" },
  about: { title: "About", description: "Why The Sellers Network exists and how it is run.", note: "about page: why the forum exists, who runs it, how it is funded (week 2)" },
  privacy: { title: "Privacy policy", description: "How The Sellers Network handles your data.", note: "privacy policy covering Supabase, PostHog with consent, Resend, Stripe, data export and deletion" },
  terms: { title: "Terms", description: "Terms of use for The Sellers Network.", note: "terms of use" },
};

export function generateStaticParams() {
  return Object.keys(pages).map((page) => ({ page }));
}

export async function generateMetadata({ params }: PageProps<"/[page]">): Promise<Metadata> {
  const { page } = await params;
  const entry = pages[page];
  if (!entry) return {};
  return { title: entry.title, description: entry.description, alternates: { canonical: `/${page}` } };
}

export default async function MarketingPage({ params }: PageProps<"/[page]">) {
  const { page } = await params;
  const entry = pages[page];
  if (!entry) notFound();
  return (
    <main id="main" className="mx-auto w-full max-w-3xl flex-1 px-4 py-16 sm:px-6">
      <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{entry.title}</h1>
      <p className="mt-3 text-lg text-muted-foreground">{entry.description}</p>
      <p className="mt-8 rounded-md border border-dashed bg-secondary px-3 py-2 text-sm text-muted-foreground">[TOM: {entry.note}]</p>
      {page === "autopilot" || page === "mentoring" || page === "course" ? (
        <div className="mt-10">
          <EmailSignupCard source={`/${page}`} variant="inline" />
        </div>
      ) : null}
    </main>
  );
}
