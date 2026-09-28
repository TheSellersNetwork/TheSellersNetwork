import type { Metadata } from "next";
import { ContactForm } from "@/components/contact-form";
import { OperatorDetails } from "@/components/legal/operator-details";
import { getCurrentUser } from "@/lib/auth";
import { contactKinds } from "@/lib/contact";

export const metadata: Metadata = {
  title: "Contact us",
  description: "Get in touch with The Sellers Network: questions, reports, data requests, complaints, appeals and legal notices.",
  alternates: { canonical: "/contact" },
};

export default async function ContactPage({ searchParams }: PageProps<"/contact">) {
  const sp = await searchParams;
  const user = await getCurrentUser();
  const kind = typeof sp.kind === "string" && (contactKinds as readonly string[]).includes(sp.kind) ? sp.kind : "general";
  return (
    <main id="main" className="mx-auto w-full max-w-2xl flex-1 px-4 py-10 sm:px-6">
      <h1 className="text-3xl font-semibold tracking-tight">Contact us</h1>
      <p className="mt-2 text-muted-foreground">Questions, reports, data requests, complaints, appeals and legal notices all come here, and a person reads every one.</p>
      <div className="mt-8">
        <ContactForm initialKind={kind} signedIn={!!user} turnstileSiteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY} />
      </div>
      <section className="mt-12 text-sm">
        <h2 className="font-semibold">Who runs this site</h2>
        <div className="mt-2 text-muted-foreground">
          <OperatorDetails />
        </div>
      </section>
    </main>
  );
}
