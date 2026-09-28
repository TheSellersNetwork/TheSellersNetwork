import type { Metadata } from "next";
import Link from "next/link";
import { DownloadCard } from "@/components/tools/download-card";
import { ToolHeader } from "@/components/tools/tool-header";
import { downloads } from "@/lib/tools/downloads";

export const metadata: Metadata = {
  title: "Free spreadsheets for resellers",
  description: "Free bookkeeping spreadsheet, stock tracker and sourcing log for UK resellers. Works in Excel, Numbers and Google Sheets.",
  alternates: { canonical: "/tools/downloads" },
};

export default function DownloadsPage() {
  return (
    <main id="main" className="mx-auto w-full max-w-3xl flex-1 px-4 py-10 sm:px-6">
      <ToolHeader title="Free spreadsheets" intro="Three spreadsheets that cover most of the admin. Each opens with a sheet explaining what to fill in. No sign-up, no email needed." />
      <ul className="space-y-4">
        {downloads.map((d) => (
          <li key={d.id}>
            <DownloadCard file={d.id} />
            <p className="mt-2 pl-1 text-xs text-muted-foreground">Sheets: {d.sheets.join(", ")}.</p>
          </li>
        ))}
      </ul>
      <section className="mt-10 space-y-2 text-sm text-muted-foreground">
        <h2 className="font-semibold text-foreground">Opening them</h2>
        <p>Excel and Numbers: open the file. Google Sheets: go to File, then Import, then Upload, and choose the file. The white cells are for you to fill in; the grey cells work themselves out.</p>
        <p>
          Got a better layout? Share it in{" "}
          <Link href="/community/c/tools-and-automation" className="underline">
            Tools and automation
          </Link>
          .
        </p>
      </section>
    </main>
  );
}
