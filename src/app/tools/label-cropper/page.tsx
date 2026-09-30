import type { Metadata } from "next";
import Link from "next/link";
import { LabelCropper } from "@/components/tools/label-cropper";
import { ToolHeader } from "@/components/tools/tool-header";
import { MAX_FILE_MB, MAX_PAGES } from "@/lib/tools/label-crop";
import { BreadcrumbJsonLd, WebApplicationJsonLd } from "@/components/seo/json-ld";
import { siteConfig } from "@/lib/site";

const title = "Free shipping label cropper: A4 label PDFs to 4x6 or A6";
const description =
  "Crop the label out of A4 shipping label PDFs, screenshots or photos and print it on 4x6, A6 or 100 x 150 mm labels, or 2 or 4 to an A4 sheet. Works in your browser, so names and addresses never leave your device. Free.";

export const metadata: Metadata = {
  title: { absolute: title },
  description,
  alternates: { canonical: "/tools/label-cropper" },
  openGraph: { title, description, url: "/tools/label-cropper", siteName: siteConfig.name, locale: "en_GB", type: "website" },
  twitter: { card: "summary_large_image", title, description },
};

const tips = [
  "In the print window, choose “Actual size” or 100%. “Fit to page” or “Shrink to fit” can make the label smaller and the barcode harder to scan.",
  "Set the paper or label size in the print window and in your printer’s own settings to the size you chose here.",
  "Print one label on plain paper first and hold it against a blank label to check nothing is cut off.",
  "Check each label before you stick it on: the whole barcode, the address and any code should be there and sharp.",
];

export default function LabelCropperPage() {
  return (
    <main id="main" className="mx-auto w-full max-w-5xl flex-1 px-4 py-10 sm:px-6">
      <WebApplicationJsonLd name="Shipping label cropper" description={description} url="/tools/label-cropper" />
      <BreadcrumbJsonLd
        items={[
          { name: "Tools", url: "/tools" },
          { name: "Shipping label cropper", url: "/tools/label-cropper" },
        ]}
      />
      <ToolHeader
        title="Shipping label cropper"
        intro="Add the A4 label PDFs, screenshots or photos from your selling apps. The label is found on each page and cropped out, and you can adjust the crop before downloading them ready to print on 4x6, A6 or 100 x 150 mm labels, or 2 or 4 to an A4 sheet."
        parent={{ href: "/tools/postage", label: "Postage finder" }}
      >
        <p className="mt-2 text-sm text-muted-foreground">
          For label PDFs and pictures from any selling app or carrier. Selling on Vinted? The{" "}
          <Link href="/tools/vinted-label-cropper" className="font-medium text-brand underline underline-offset-2">
            Vinted label cropper
          </Link>{" "}
          has the same tool with notes on each Vinted carrier.
        </p>
      </ToolHeader>
      <LabelCropper />
      <section className="mt-12">
        <h2 className="text-lg font-semibold">Printing the labels</h2>
        <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
          {tips.map((t) => (
            <li key={t}>{t}</li>
          ))}
        </ul>
        <p className="mt-3 text-sm text-muted-foreground">
          Settings for thermal printers, A6 and A4 label sheets, and what each platform says about its labels, are in{" "}
          <Link href="/tools/postage?tab=labels" className="underline">
            label printing
          </Link>
          .
        </p>
      </section>
      <section className="mt-10">
        <h2 className="text-lg font-semibold">How it works</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Each page is drawn small in your browser and the label is found as the biggest solid block of print, leaving out instructions and cut lines. It is a best guess, so check each crop. For PDFs, the label is copied from the original page rather than as a picture, so text and barcodes stay sharp at any size. Pictures are cropped and placed as they are, so a blurry photo stays blurry. A PDF that is locked against changes is copied as a picture at 300 dpi instead, and you are told when that happens.
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          You can add up to {MAX_PAGES} pages in total, and each file can be up to {MAX_FILE_MB} MB. Pages with nothing on them are skipped. Your size, margin and download choices are remembered in this browser only.
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          PDFs are read with PDF.js (Apache 2.0 licence) and written with pdf-lib (MIT licence), both served from this site and run on your device.
        </p>
      </section>
    </main>
  );
}
