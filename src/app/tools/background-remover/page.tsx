import type { Metadata } from "next";
import { BackgroundRemover } from "@/components/tools/background-remover";
import { ToolHeader } from "@/components/tools/tool-header";

export const metadata: Metadata = {
  title: "Product photo background remover",
  description:
    "Remove the background from one product photo or hundreds, in your browser. White, light grey or transparent, square or 4:5, with presets for eBay, Vinted, Depop and Etsy. Free, and your photos never leave your device.",
  alternates: { canonical: "/tools/background-remover" },
};

const tips = [
  "It works best on a single item against a plain, contrasting background, in good light.",
  "Busy scenes, several items, see-through or shiny things, fur and hair may need touching up afterwards. Open a photo and use Touch up.",
  "If you can see a hard outline or a halo of the old background, try the edge softness slider.",
  "This is for basic use. Paid tools and photo editors may do a better job on hard photos.",
  "Check each photo before you list it, and follow each platform's own photo rules.",
];

export default function BackgroundRemoverPage() {
  return (
    <main id="main" className="mx-auto w-full max-w-5xl flex-1 px-4 py-10 sm:px-6">
      <ToolHeader
        title="Product photo background remover"
        intro="Add one photo or a few hundred and the background is removed on your device. Choose white, light grey or transparent, square or 4:5, and each item is centred with space around it, ready to download one by one, as a zip, or straight into a folder."
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
        <h2 className="text-lg font-semibold">Big batches</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          You can add up to 500 photos at once, or drop in a whole folder. They are done one after another, and you can pause, carry on or cancel at any time. A photo that fails does not stop the rest; you can retry it at the end. On a computer with Chrome or Edge you can save each photo straight into a folder as it finishes. Otherwise download them as a zip, split into parts of about 200 MB for big batches. Leave the tab open while it works. Time per photo depends on your device.
        </p>
      </section>
      <section className="mt-10">
        <h2 className="text-lg font-semibold">How it works</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The first time you add a photo, your browser downloads a small image model (U-2-Net, under the Apache 2.0 licence) and ONNX Runtime Web (MIT licence) from this site. Both run on your device, on your graphics chip where the browser allows it, so your photos are never uploaded anywhere. White and grey backgrounds download as JPEG, transparent as PNG. Your settings are remembered in this browser only.
        </p>
      </section>
    </main>
  );
}
