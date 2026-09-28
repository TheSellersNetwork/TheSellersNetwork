import type { Metadata } from "next";
import Link from "next/link";
import { BookOpen, CalendarClock, FileSpreadsheet, History, Package } from "lucide-react";
import { tools } from "@/lib/tools/downloads";

export const metadata: Metadata = {
  title: "Tools",
  description: "Free tools for UK resellers: parcel size checker, tax dates, fee and policy changes, spreadsheets and a glossary.",
  alternates: { canonical: "/tools" },
};

const icons = { package: Package, calendar: CalendarClock, history: History, sheet: FileSpreadsheet, book: BookOpen };

export default function ToolsPage() {
  return (
    <main id="main" className="mx-auto w-full max-w-5xl flex-1 px-4 py-10 sm:px-6">
      <h1 className="text-3xl font-semibold tracking-tight">Tools</h1>
      <p className="mt-2 max-w-2xl text-muted-foreground">Free, no sign-up. The quick checks you would otherwise do in five browser tabs.</p>
      <ul className="mt-8 grid gap-4 sm:grid-cols-2">
        {tools.map((t) => {
          const Icon = icons[t.icon];
          return (
            <li key={t.href} className="forum-card row-enter relative rounded-xl border bg-card p-5 hover:border-brand/60">
              <Icon className="size-6 text-brand" aria-hidden="true" />
              <h2 className="mt-3 font-semibold">
                <Link href={t.href} className="after:absolute after:inset-0">
                  {t.title}
                </Link>
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">{t.description}</p>
            </li>
          );
        })}
      </ul>
    </main>
  );
}
