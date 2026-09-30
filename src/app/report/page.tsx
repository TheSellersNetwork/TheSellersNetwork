import type { Metadata } from "next";
import { ContactForm } from "@/components/contact-form";
import { getCurrentUser } from "@/lib/auth";
import { siteConfig } from "@/lib/site";

/* Kinds a link can open the report form on, for example from the flag button. */
const linkableKinds = ["report", "defamation", "copyright"];

export const metadata: Metadata = {
  title: "Report content",
  description: "Report illegal or harmful content on The Sellers Network. No account needed.",
  alternates: { canonical: "/report" },
};

/* Open to anyone, including people without an account who are affected by something posted here. */
export default async function ReportPage({ searchParams }: PageProps<"/report">) {
  const sp = await searchParams;
  // Only our own pages can be prefilled, so a link cannot plant an outside address in the form.
  const initialUrl = typeof sp.url === "string" && sp.url.startsWith(`${siteConfig.url}/`) ? sp.url.slice(0, 500) : undefined;
  const initialKind = typeof sp.kind === "string" && linkableKinds.includes(sp.kind) ? sp.kind : "report";
  const user = await getCurrentUser();
  return (
    <main id="main" className="mx-auto w-full max-w-2xl flex-1 px-4 py-10 sm:px-6">
      <h1 className="text-3xl font-semibold tracking-tight">Report content</h1>
      <p className="mt-2 text-muted-foreground">
        Tell us about anything on the site that is illegal, harmful, a scam, or about you and untrue. You do not need an account. Members can also use the flag button on any post.
      </p>
      <p className="mt-2 text-muted-foreground">
        If a post is untrue and harms your reputation, choose &ldquo;A post is defamatory about me&rdquo;. That form asks for what the law needs so we can pass your complaint to the person who posted it.
      </p>
      <p className="mt-2 text-sm text-muted-foreground">If someone is in immediate danger, call 999. To report child sexual abuse material, you can also report it directly to the Internet Watch Foundation at report.iwf.org.uk.</p>
      <div className="mt-8">
        <ContactForm initialKind={initialKind} initialUrl={initialUrl} signedIn={!!user} turnstileSiteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY} />
      </div>
    </main>
  );
}
