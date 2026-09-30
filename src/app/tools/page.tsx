import type { Metadata } from "next";
import Link from "next/link";
import {
  Boxes,
  Calculator,
  CalendarClock,
  Check,
  Clock,
  Coins,
  Crop,
  FileSpreadsheet,
  FileUp,
  ImageMinus,
  MessageSquareText,
  Percent,
  ShieldCheck,
  Tag,
  Tags,
  Truck,
  type LucideIcon,
} from "lucide-react";
import { toolGroups, type ToolIcon } from "@/lib/tools/catalogue";

export const metadata: Metadata = {
  title: "Free tools for UK resellers",
  description:
    "Free calculators and tools for UK resellers: a fee and profit calculator for every platform, pricing, tax and VAT, postage, listing copy, buyer message templates, a stock tracker, sales reports and Amazon claims. No sign-up.",
  alternates: { canonical: "/tools" },
};

const icons: Record<ToolIcon, LucideIcon> = {
  calculator: Calculator,
  clock: Clock,
  tags: Tags,
  percent: Percent,
  tag: Tag,
  image: ImageMinus,
  truck: Truck,
  calendar: CalendarClock,
  file: FileUp,
  coins: Coins,
  sheet: FileSpreadsheet,
  shield: ShieldCheck,
  boxes: Boxes,
  message: MessageSquareText,
  crop: Crop,
};

export default function ToolsPage() {
  return (
    <main id="main" className="mx-auto w-full max-w-6xl flex-1 px-4 py-10 sm:px-6">
      <h1 className="text-3xl font-semibold tracking-tight">Free tools</h1>
      <p className="mt-2 max-w-2xl text-muted-foreground">
        The calculators and checks sellers usually pay a monthly subscription for, free and with no sign-up. Fees come from each platform&rsquo;s own pages, with the date we last checked them.
      </p>
      <nav aria-label="Tool groups" className="mt-6 flex flex-wrap gap-2">
        {toolGroups.map((g) => (
          <a key={g.title} href={`#${g.title.toLowerCase().replace(/[^a-z]+/g, "-")}`} className="rounded-full border bg-card px-3 py-1 text-sm hover:border-brand/60">
            {g.title}
          </a>
        ))}
      </nav>
      {toolGroups.map((g) => (
        <section key={g.title} id={g.title.toLowerCase().replace(/[^a-z]+/g, "-")} className="mt-10 scroll-mt-20">
          <h2 className="text-xl font-semibold tracking-tight">{g.title}</h2>
          <ul className="mt-4 grid gap-4 md:grid-cols-2">
            {g.tools.map((t) => {
              const Icon = icons[t.icon];
              return (
                <li key={t.href} className="forum-card row-enter relative flex gap-4 rounded-xl border bg-card p-5 hover:border-brand/60 sm:p-6">
                  <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-brand/10">
                    <Icon className="size-6 text-brand" aria-hidden="true" />
                  </span>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-lg font-semibold">
                        <Link href={t.href} className="after:absolute after:inset-0">
                          {t.title}
                        </Link>
                      </h3>
                      {t.badge ? <span className="rounded-full bg-brand/15 px-2 py-0.5 text-xs text-brand">{t.badge}</span> : null}
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">{t.description}</p>
                    {t.includes?.length ? (
                      <ul className="mt-3 space-y-1 text-sm" aria-label={`Inside ${t.title}`}>
                        {t.includes.map((item) => (
                          <li key={item} className="flex items-start gap-2">
                            <Check className="mt-0.5 size-4 shrink-0 text-brand" aria-hidden="true" />
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </main>
  );
}
