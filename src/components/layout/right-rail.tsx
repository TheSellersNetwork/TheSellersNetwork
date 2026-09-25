import Link from "next/link";
import { EmailSignupCard } from "@/components/marketing/email-signup-card";
import { SponsorSlot } from "@/components/partners/sponsor-slot";
import { TopAnswerers } from "@/components/forum/top-answerers";
import { urls } from "@/lib/forum/urls";

export function RightRail({ children, source }: { children?: React.ReactNode; source?: string }) {
  return (
    <aside className="hidden xl:block" aria-label="Related">
      <div className="sticky top-[calc(var(--header-height)+1.5rem)] space-y-6">
        {children}
        <EmailSignupCard source={source ?? "rail"} />
        <TopAnswerers />
        <SponsorSlot slot="rail" page={source ?? "rail"} />
        <div className="forum-card rail-card rounded-lg border bg-card p-4 text-sm">
          <h2 className="font-semibold">House rules</h2>
          <p className="mt-1 text-muted-foreground">
            Be useful, no selling, real numbers welcome.{" "}
            <Link href={urls.rules()} className="text-brand underline underline-offset-2 hover:text-brand-deep">
              Read all six
            </Link>
          </p>
        </div>
      </div>
    </aside>
  );
}

/* A guide matched to the current category, shown on topic pages. */
export function GuideCard({ guide }: { guide: { slug: string; title: string; excerpt: string } | null }) {
  if (!guide) return null;
  return (
    <div className="forum-card rail-card rounded-lg border bg-card p-4 text-sm">
      <h2 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Related guide</h2>
      <Link href={urls.guide(guide.slug)} className="mt-1 block font-semibold hover:underline">
        {guide.title}
      </Link>
      <p className="mt-1 text-muted-foreground">{guide.excerpt}</p>
    </div>
  );
}
