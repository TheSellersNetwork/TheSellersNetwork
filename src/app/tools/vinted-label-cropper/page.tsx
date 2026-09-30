import type { Metadata } from "next";
import Link from "next/link";
import { LabelCropper } from "@/components/tools/label-cropper";
import { ToolHeader } from "@/components/tools/tool-header";
import { VintedJoinCard } from "@/components/tools/vinted-join-card";
import { EmailSignupCard } from "@/components/marketing/email-signup-card";
import { BreadcrumbJsonLd, FaqJsonLd, WebApplicationJsonLd } from "@/components/seo/json-ld";
import { VINTED_CHECKED, vintedCarriers, vintedFaqs, vintedLabelPage as v, vintedPrintSteps } from "@/lib/tools/vinted-label";
import { siteConfig } from "@/lib/site";

export const metadata: Metadata = {
  title: { absolute: v.title },
  description: v.description,
  alternates: { canonical: v.path },
  openGraph: { title: v.title, description: v.description, url: v.path, siteName: siteConfig.name, locale: "en_GB", type: "website" },
  twitter: { card: "summary_large_image", title: v.title, description: v.description },
};

export default function VintedLabelCropperPage() {
  return (
    <main id="main" className="mx-auto w-full max-w-5xl flex-1 px-4 py-10 sm:px-6">
      <WebApplicationJsonLd name="Vinted label cropper" description={v.description} url={v.path} />
      <BreadcrumbJsonLd
        items={[
          { name: "Tools", url: "/tools" },
          { name: "Shipping label cropper", url: "/tools/label-cropper" },
          { name: "Vinted label cropper", url: v.path },
        ]}
      />
      <FaqJsonLd items={vintedFaqs} />
      <ToolHeader title={v.h1} intro={v.intro} parent={{ href: "/tools/label-cropper", label: "Shipping label cropper" }}>
        <p className="mt-2 text-sm text-muted-foreground">Not affiliated with or endorsed by Vinted.</p>
      </ToolHeader>
      <LabelCropper defaultSize="4x6" dropTitle="Drop your Vinted label PDF or screenshot here, or paste one" afterDownload={<VintedJoinCard />} />

      <section aria-labelledby="vinted-steps" className="mt-12">
        <h2 id="vinted-steps" className="text-xl font-semibold tracking-tight">
          How to print a Vinted label on a thermal printer
        </h2>
        <ol className="mt-4 space-y-3">
          {vintedPrintSteps.map((s, i) => (
            <li key={s.title} className="flex gap-3">
              <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-secondary text-sm font-medium" aria-hidden="true">
                {i + 1}
              </span>
              <div className="text-sm">
                <h3 className="font-medium">{s.title}</h3>
                <p className="mt-0.5 text-muted-foreground">{s.detail}</p>
              </div>
            </li>
          ))}
        </ol>
        <p className="mt-4 text-sm text-muted-foreground">
          The full walk-through, with paper sizes and what to do when a label will not scan, is in{" "}
          <Link href="/guides/how-to-print-vinted-labels-at-home" className="underline">
            how to print Vinted labels at home
          </Link>
          .
        </p>
      </section>

      <section aria-labelledby="vinted-carriers" className="mt-12">
        <h2 id="vinted-carriers" className="text-xl font-semibold tracking-tight">
          Vinted labels by carrier
        </h2>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Only a printable label needs cropping. Where Vinted gives you a QR code, there is nothing to print: the drop-off point prints the label for you. From Vinted&rsquo;s UK Help Centre, checked on {VINTED_CHECKED}. Vinted changes its carriers, so check the linked page if something looks different in your app.
        </p>
        <ul className="mt-4 grid gap-3 md:grid-cols-2">
          {vintedCarriers.map((c) => (
            <li key={c.name} className="rounded-xl border bg-card p-4 text-sm">
              <h3 className="font-semibold">{c.name}</h3>
              <p className="mt-0.5 text-xs font-medium text-brand">{c.label}</p>
              <p className="mt-2 text-muted-foreground">{c.detail}</p>
              <p className="mt-2 text-xs">
                {c.source.map((s, i) => (
                  <span key={s.href}>
                    {i > 0 ? ", " : "Source: "}
                    <a href={s.href} className="underline" rel="noopener noreferrer" target="_blank">
                      {s.label}
                    </a>
                  </span>
                ))}
              </p>
            </li>
          ))}
        </ul>
        <p className="mt-4 text-sm text-muted-foreground">
          Drop-off rules, size limits and what happens when a parcel is lost are in our{" "}
          <Link href="/guides/vinted-postage-options" className="underline">
            Vinted postage guide
          </Link>
          .
        </p>
      </section>

      <section aria-labelledby="vinted-printer" className="mt-12">
        <h2 id="vinted-printer" className="text-xl font-semibold tracking-tight">
          Which printer?
        </h2>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          If most of your parcels go by Royal Mail, DPD or Relay, or you pick the QR code for Evri and InPost, you may not need a printer at all. If you print a lot of labels, a thermal printer uses heat-sensitive labels with no ink, and the common shipping label size is 4 x 6 inches. We compared seven, with prices from each maker&rsquo;s own UK page, in{" "}
          <Link href="/blog/thermal-label-printers-compared" className="underline">
            thermal label printers compared
          </Link>
          . For an ordinary printer, choose A4 with 2 or 4 labels a sheet above and print on sticky label sheets or plain paper.
        </p>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Labels from eBay, Royal Mail Click &amp; Drop and other apps work here too: the{" "}
          <Link href="/tools/label-cropper" className="underline">
            shipping label cropper
          </Link>{" "}
          covers every carrier, and{" "}
          <Link href="/tools/postage?tab=labels" className="underline">
            label printing settings
          </Link>{" "}
          has the print settings for each.
        </p>
      </section>

      <section aria-labelledby="vinted-faq" className="mt-12">
        <h2 id="vinted-faq" className="text-xl font-semibold tracking-tight">
          Questions about printing Vinted labels
        </h2>
        <dl className="mt-4 divide-y rounded-xl border bg-card" data-testid="vinted-faq">
          {vintedFaqs.map((f) => (
            <div key={f.question} className="p-4 text-sm">
              <dt className="font-medium">{f.question}</dt>
              <dd className="mt-1 text-muted-foreground">{f.answer}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-3 text-xs text-muted-foreground">
          Sources: Vinted&rsquo;s{" "}
          <a href="https://www.vinted.co.uk/help/154-shipping-label-not-received-or-not-working" className="underline" rel="noopener noreferrer" target="_blank">
            shipping label not received or not working
          </a>{" "}
          and the carrier pages linked above.
        </p>
      </section>

      <EmailSignupCard source="/tools/vinted-label-cropper" className="mt-12 max-w-xl" />

      <section aria-labelledby="vinted-how" className="mt-12">
        <h2 id="vinted-how" className="text-lg font-semibold">
          How it works
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Each page is drawn small in your browser and the label is found as the biggest solid block of print, leaving out instructions and cut lines. It is a best guess, so check each crop. From a PDF, the label is copied as it is rather than as a picture, so the barcode stays sharp at any size. PDF.js (Apache 2.0 licence) and pdf-lib (MIT licence) do the reading and writing, served from this site and run on your device, and they only load once you add a file.
        </p>
      </section>
    </main>
  );
}
