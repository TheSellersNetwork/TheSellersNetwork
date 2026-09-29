import type { Metadata } from "next";
import { BackgroundRemover } from "@/components/tools/background-remover";
import { ToolHeader } from "@/components/tools/tool-header";

export const metadata: Metadata = {
  title: "Product photo background remover",
  description:
    "Remove the background from product photos in your browser, then download them on white, light grey or transparent, square or 4:5. Free, and your photos never leave your device.",
  alternates: { canonical: "/tools/background-remover" },
};

const tips = [
  "It works best on a single item against a plain, contrasting background, in good light.",
  "Busy scenes, several items, see-through or shiny things, fur and hair may need touching up afterwards.",
  "If you can see a hard outline or a halo of the old background, try moving the edge softness slider.",
  "This is for basic use. Paid tools and photo editors may do a better job on hard photos.",
  "Check each photo before you list it, and follow each platform's own photo rules.",
];

export default function BackgroundRemoverPage() {
  return (
    <main id="main" className="mx-auto w-full max-w-4xl flex-1 px-4 py-10 sm:px-6">
      <ToolHeader
        title="Product photo background remover"
        intro="Pick your product photos and the background is removed on your device. Choose white, light grey or transparent, square or 4:5, and the item is centred with space around it, ready to download."
      />
      <BackgroundRemover />
      <section className="mt-12">
        <h2 className="text-lg font-semibold">Getting good results</h2>
        <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
          {tips.map((t) => (
            <li key={t}>{t}</li>
          ))}
        </ul>
      </section>
      <section className="mt-10">
        <h2 className="text-lg font-semibold">How it works</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The first time you pick a photo, your browser downloads a small image model (U-2-Net, under the Apache 2.0
          licence) and ONNX Runtime Web (MIT licence) from this site. Both run on your device, so your photos are never
          uploaded anywhere. White and grey backgrounds download as JPEG, transparent as PNG.
        </p>
      </section>
    </main>
  );
}
