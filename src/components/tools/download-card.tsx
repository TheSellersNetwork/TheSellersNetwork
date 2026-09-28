import Link from "next/link";
import { FileSpreadsheet } from "lucide-react";
import { downloads, type DownloadFile } from "@/lib/tools/downloads";
import { cn } from "@/lib/utils";

/* A free spreadsheet, shown on the downloads page and inside the guide it belongs to. */
export function DownloadCard({ file, showGuide = true, className }: { file: DownloadFile["id"]; showGuide?: boolean; className?: string }) {
  const d = downloads.find((x) => x.id === file);
  if (!d) return null;
  return (
    <div className={cn("not-prose forum-card flex flex-col gap-3 rounded-xl border bg-card p-4 sm:flex-row sm:items-center", className)}>
      <FileSpreadsheet className="size-8 shrink-0 text-success" aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <p className="font-semibold">Free download: {d.title}</p>
        <p className="text-sm text-muted-foreground">{d.description}</p>
        {showGuide ? (
          <p className="mt-1 text-xs text-muted-foreground">
            How to use it:{" "}
            <Link href={`/guides/${d.guide.slug}`} className="underline">
              {d.guide.title}
            </Link>
          </p>
        ) : null}
      </div>
      <a href={d.file} download className="inline-flex shrink-0 items-center justify-center rounded-md bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-deep">
        Download (.xlsx)
      </a>
    </div>
  );
}
