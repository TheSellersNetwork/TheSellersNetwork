import type { Metadata } from "next";
import Link from "next/link";
import {
  AlarmClock,
  Barcode,
  BookOpen,
  Box,
  Calculator,
  CalendarClock,
  Car,
  ChartColumn,
  Clock,
  Coins,
  FileSpreadsheet,
  FileUp,
  Handshake,
  History,
  ImageMinus,
  Package,
  Percent,
  Radio,
  Scale,
  ShieldCheck,
  SquareArrowDown,
  Store,
  Tag,
  Tags,
  TrendingDown,
  Truck,
  type LucideIcon,
} from "lucide-react";
import { toolGroups, type ToolIcon } from "@/lib/tools/catalogue";

export const metadata: Metadata = {
  title: "Free tools for UK resellers",
  description:
    "Free calculators and tools for UK resellers: where to sell, fee calculators for every platform, Amazon FBA, profit and loss from your sales reports, postage, VAT and more. No sign-up.",
  alternates: { canonical: "/tools" },
};

const icons: Record<ToolIcon, LucideIcon> = {
  scale: Scale,
  calculator: Calculator,
  handshake: Handshake,
  box: Box,
  clock: Clock,
  car: Car,
  radio: Radio,
  truck: Truck,
  package: Package,
  file: FileUp,
  calendar: CalendarClock,
  receipt: FileSpreadsheet,
  shield: ShieldCheck,
  percent: Percent,
  history: History,
  sheet: FileSpreadsheet,
  book: BookOpen,
  tag: Tag,
  tags: Tags,
  trending: TrendingDown,
  barcode: Barcode,
  alarm: AlarmClock,
  store: Store,
  image: ImageMinus,
  chart: ChartColumn,
  floor: SquareArrowDown,
  coins: Coins,
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
          <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {g.tools.map((t) => {
              const Icon = icons[t.icon];
              return (
                <li key={t.href} className="forum-card row-enter relative rounded-xl border bg-card p-4 hover:border-brand/60">
                  <div className="flex items-center gap-2">
                    <Icon className="size-5 text-brand" aria-hidden="true" />
                    {t.badge ? <span className="rounded-full bg-brand/15 px-2 py-0.5 text-xs text-brand">{t.badge}</span> : null}
                  </div>
                  <h3 className="mt-2 font-semibold">
                    <Link href={t.href} className="after:absolute after:inset-0">
                      {t.title}
                    </Link>
                  </h3>
                  <p className="mt-1 text-sm text-muted-foreground">{t.description}</p>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </main>
  );
}
