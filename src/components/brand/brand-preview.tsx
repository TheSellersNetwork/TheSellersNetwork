"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { useTheme } from "next-themes";
import { Logo, type LogoMark } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { Brand } from "@/lib/site";
import { StyleSwitcher } from "@/components/style-switcher";
import type { StyleId } from "@/lib/style";
import { cn } from "@/lib/utils";

const palettes: { id: Brand; name: string; accent: string; deep: string; bg: string; text: string }[] =
  [
    { id: "navy", name: "Navy", accent: "#1F4E79", deep: "#0B2545", bg: "#F4F6F9", text: "#1C2B3A" },
    { id: "teal", name: "Deep teal", accent: "#0F766E", deep: "#0B4F4A", bg: "#F3F7F6", text: "#14342F" },
    { id: "slate", name: "Slate and electric blue", accent: "#2563EB", deep: "#1E293B", bg: "#F8FAFC", text: "#0F172A" },
    { id: "forest", name: "Forest green", accent: "#1B6B3A", deep: "#0F4726", bg: "#F5F8F5", text: "#16261C" },
  ];

const marks: { id: LogoMark; name: string; note: string }[] = [
  { id: "nodes", name: "Nodes", note: "Three connected nodes. The clearest network reading." },
  { id: "ascend", name: "Ascend", note: "Nodes climbing left to right. Network plus growth." },
  { id: "chevron", name: "Chevron", note: "A single upward chevron. Quieter, more editorial." },
  { id: "none", name: "Wordmark only", note: "No mark. Cleanest, relies on typography." },
];

export function BrandPreview({ initialStyle }: { initialStyle: StyleId }) {
  const [brand, setBrand] = useState<Brand>("teal");
  const [mark, setMark] = useState<LogoMark>("nodes");
  const { resolvedTheme, setTheme } = useTheme();
  /* True only after hydration, so the theme button never mismatches the server render. */
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  /* Swap the palette on <html> so every token on the page follows. */
  useEffect(() => {
    document.documentElement.dataset.brand = brand;
  }, [brand]);

  return (
    <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <header className="mb-10 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">Internal, not linked from the site</p>
          <h1 className="text-2xl font-semibold tracking-tight">Brand options</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          {mounted ? (
            <Button
              variant="outline"
              onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
            >
              {resolvedTheme === "dark" ? "Switch to light" : "Switch to dark"}
            </Button>
          ) : null}
        </div>
      </header>

      <section className="mb-12">
        <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-muted-foreground">
          1. Palette
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {palettes.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setBrand(p.id)}
              aria-pressed={brand === p.id}
              className={cn(
                "rounded-lg border bg-card p-4 text-left transition-colors hover:border-foreground/30",
                brand === p.id && "border-brand ring-2 ring-brand",
              )}
            >
              <div className="mb-3 flex gap-1.5">
                <Swatch hex={p.accent} />
                <Swatch hex={p.deep} />
                <Swatch hex={p.bg} bordered />
                <Swatch hex={p.text} />
              </div>
              <div className="font-medium">{p.name}</div>
              <div className="text-xs text-muted-foreground">
                {p.accent} accent, {p.deep} hover
              </div>
            </button>
          ))}
        </div>
      </section>

      <section className="mb-12">
        <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-muted-foreground">
          2. Style
        </h2>
        <p className="mb-3 text-sm text-muted-foreground">
          Changes the whole site as you click. Open the community in another tab to see it on real pages. Members can also pick their own from their account page.
        </p>
        <StyleSwitcher initialStyle={initialStyle} />
      </section>

      <section className="mb-12">
        <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-muted-foreground">
          3. Logo
        </h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {marks.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => setMark(m.id)}
              aria-pressed={mark === m.id}
              className={cn(
                "rounded-lg border bg-card p-6 text-left transition-colors hover:border-foreground/30",
                mark === m.id && "border-brand ring-2 ring-brand",
              )}
            >
              <Logo mark={m.id} size={28} />
              <div className="mt-4 font-medium">{m.name}</div>
              <div className="text-sm text-muted-foreground">{m.note}</div>
            </button>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-muted-foreground">
          4. In context
        </h2>
        <SampleForumChrome mark={mark} />
        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <LogoSheet mark={mark} tone="light" />
          <LogoSheet mark={mark} tone="dark" />
        </div>
      </section>
    </main>
  );
}

function Swatch({ hex, bordered }: { hex: string; bordered?: boolean }) {
  return (
    <span
      className={cn("h-8 flex-1 rounded", bordered && "border")}
      style={{ background: hex }}
      title={hex}
    />
  );
}

/* A slice of the real forum header and a topic row, so the palette is judged where it will live. */
function SampleForumChrome({ mark }: { mark: LogoMark }) {
  return (
    <div className="overflow-hidden rounded-lg border bg-background">
      <div className="flex h-14 items-center justify-between border-b bg-card px-4">
        <Logo mark={mark} size={22} />
        <div className="hidden items-center gap-2 sm:flex">
          <div className="h-9 w-56 rounded-md border bg-background px-3 text-sm leading-9 text-muted-foreground">
            Search
          </div>
          <Button size="sm">New topic</Button>
          <span className="grid size-8 place-items-center rounded-full bg-secondary text-xs font-medium">
            TS
          </span>
        </div>
      </div>
      <ul className="divide-y">
        {[
          { title: "Royal Mail Tracked 24 versus Tracked 48 for small parcels", cat: "Postage and packaging", bar: "var(--cat-ebay)", solved: true },
          { title: "FBA fee changes, what are you doing about them", cat: "FBA and FBM", bar: "var(--cat-amazon)", solved: false },
          { title: "Car boot sourcing, what worked for you this month", cat: "Wins and case studies", bar: "var(--cat-general)", solved: false },
        ].map((t) => (
          <li key={t.title} className="flex items-center gap-4 px-4 py-3">
            <span className="h-8 w-1 rounded-full" style={{ background: t.bar }} />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <a href="#" className="truncate font-medium hover:underline">
                  {t.title}
                </a>
                {t.solved ? <Badge className="bg-success text-white">Solved</Badge> : null}
              </div>
              <div className="text-xs text-muted-foreground">{t.cat}</div>
            </div>
            <div className="hidden text-sm text-muted-foreground sm:block">12 replies</div>
            <div className="hidden text-sm text-muted-foreground sm:block">2h</div>
          </li>
        ))}
      </ul>
      <div className="flex flex-wrap items-center gap-3 border-t bg-card px-4 py-3 text-sm">
        <a href="#" className="text-brand underline-offset-4 hover:underline">
          A link in the accent colour
        </a>
        <Button variant="secondary" size="sm">
          Secondary
        </Button>
        <Button variant="outline" size="sm">
          Outline
        </Button>
        <Button size="sm">Primary</Button>
      </div>
    </div>
  );
}

/* Lockups on a fixed light and a fixed dark background, independent of the page theme. */
function LogoSheet({ mark, tone }: { mark: LogoMark; tone: "light" | "dark" }) {
  return (
    <div
      className={cn(
        "flex flex-col gap-6 rounded-lg border p-6",
        tone === "dark" ? "dark bg-[#0c1716] text-[#e4efed]" : "bg-white text-[#14342f]",
      )}
    >
      <Logo mark={mark} size={40} />
      <Logo mark={mark} size={24} />
      <Logo mark={mark} size={16} />
    </div>
  );
}
