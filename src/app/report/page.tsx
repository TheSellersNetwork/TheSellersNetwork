import type { Metadata } from "next";
import { ContactForm } from "@/components/contact-form";
import { getCurrentUser } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Report content",
  description: "Report illegal or harmful content on The Sellers Network. No account needed.",
  alternates: { canonical: "/report" },
};

/* Open to anyone, including people without an account who are affected by something posted here. */
export default async function ReportPage() {
  const user = await getCurrentUser();
  return (
    <main id="main" className="mx-auto w-full max-w-2xl flex-1 px-4 py-10 sm:px-6">
      <h1 className="text-3xl font-semibold tracking-tight">Report content</h1>
      <p className="mt-2 text-muted-foreground">
        Tell us about anything on the site that is illegal, harmful, a scam, or about you and untrue. You do not need an account. Members can also use the flag button on any post.
      </p>
      <p className="mt-2 text-sm text-muted-foreground">If someone is in immediate danger, call 999. To report child sexual abuse material, you can also report it directly to the Internet Watch Foundation at report.iwf.org.uk.</p>
      <div className="mt-8">
        <ContactForm initialKind="report" signedIn={!!user} turnstileSiteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY} />
      </div>
    </main>
  );
}
