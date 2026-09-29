"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { BookOpen, CheckCircle2, MessageSquare, MessageSquarePlus, Newspaper, Search, Wrench } from "lucide-react";
import { loadCatalogue } from "@/components/search/command-search";
import { search, type ForumHit, type IndexEntry } from "@/components/search/search-index";
import { flatRows, moveActive, shareOut, type AskGroup } from "@/lib/home/sections/ask-search";
import { plural } from "@/lib/format";
import { urls } from "@/lib/forum/urls";
import { cn } from "@/lib/utils";

/*
  Search before you ask. One box; tools, guides and posts match instantly from
  the Ctrl+K search index, forum threads from /api/search after a short pause.
  At most five results, grouped. The last row carries the typed text into the
  ask-first flow: the question is saved in this browser, signed-out visitors
  go to sign up, members go straight to the composer with the title filled in.
  A combobox: arrow keys move through the rows, Enter opens one.
*/

const DEBOUNCE_MS = 250;
const groupIcon = { tools: Wrench, reading: BookOpen, threads: MessageSquare } as const;

type ForumState = { query: string; results: ForumHit[] };

export function AskSearchBar({ signedIn }: { signedIn: boolean }) {
  const router = useRouter();
  const id = useId();
  const listId = `${id}-list`;
  const headingId = `${id}-heading`;
  const [query, setQuery] = useState("");
  const [entries, setEntries] = useState<IndexEntry[] | null>(null);
  const [forum, setForum] = useState<ForumState | null>(null);
  const [active, setActive] = useState(0);
  const [open, setOpen] = useState(false);
  const requestId = useRef(0);
  const trimmed = query.trim();

  function ensureCatalogue() {
    if (!entries) loadCatalogue().then(setEntries, () => setEntries([]));
  }

  // Forum threads after a pause in typing; answers to an older query are dropped.
  useEffect(() => {
    if (trimmed.length < 2) return;
    const reqId = ++requestId.current;
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(trimmed)}`, { signal: controller.signal });
        const body = (await res.json()) as { results?: ForumHit[] };
        if (reqId === requestId.current) setForum({ query: trimmed, results: res.ok ? (body.results ?? []) : [] });
      } catch {
        // Aborted or offline: the index results still show.
      }
    }, DEBOUNCE_MS);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [trimmed]);

  const groups = useMemo<AskGroup[]>(() => {
    if (trimmed.length < 2) return [];
    const tools = entries ? search(entries, trimmed, "tool", 5) : [];
    const reading = entries ? search(entries, trimmed, ["guide", "post"], 5) : [];
    const threads = forum && forum.query === trimmed ? forum.results : [];
    return shareOut([
      { id: "tools", label: "Tools", results: tools.map((e) => ({ href: e.href, title: e.title, meta: e.label })) },
      { id: "reading", label: "Guides and posts", results: reading.map((e) => ({ href: e.href, title: e.title, meta: e.label })) },
      {
        id: "threads",
        label: "Forum threads",
        results: threads.map((t) => ({ href: t.href, title: t.title, meta: [t.forum, plural(t.replies, "reply", "replies"), t.solved ? "Solved" : null].filter(Boolean).join(" · "), solved: t.solved })),
      },
    ]);
  }, [entries, forum, trimmed]);

  const rows = useMemo(() => flatRows(groups), [groups]);
  const showList = open && trimmed.length >= 2;
  const current = Math.min(active, rows.length - 1);
  const optionId = (i: number) => `${id}-opt-${i}`;

  function ask() {
    try {
      localStorage.setItem("tsn:pending-title", trimmed.slice(0, 200));
    } catch {
      // Storage unavailable: the composer will just start empty.
    }
    const next = urls.newTopic();
    router.push(signedIn ? next : `${urls.signup()}?next=${encodeURIComponent(next)}`);
  }

  function openRow(i: number) {
    const row = rows[i];
    if (!row) return;
    if (row.href) router.push(row.href);
    else ask();
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!showList) {
      if (e.key === "ArrowDown" && trimmed.length >= 2) {
        e.preventDefault();
        setOpen(true);
      }
      return;
    }
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      setActive(moveActive(current, rows.length, e.key));
    } else if (e.key === "Enter") {
      e.preventDefault();
      openRow(current);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  // Where each group's rows start in keyboard order.
  const starts = groups.map((_, g) => groups.slice(0, g).reduce((n, x) => n + x.results.length, 0));
  return (
    <section aria-labelledby={headingId} data-testid="ask-search">
      <h2 id={headingId} className="text-xl font-semibold tracking-tight sm:text-2xl">
        What do you want to know?
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">Search the tools, guides and forum first. If nobody has asked it yet, ask the community.</p>
      <div className="relative mt-4">
        <Search className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
        <input
          type="search"
          role="combobox"
          aria-labelledby={headingId}
          aria-expanded={showList}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={showList && current >= 0 ? optionId(current) : undefined}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setActive(0);
            setOpen(true);
          }}
          onFocus={() => {
            ensureCatalogue();
            setOpen(true);
          }}
          onBlur={() => setOpen(false)}
          onKeyDown={onKeyDown}
          placeholder="For example: Vinted Pro, Tracked 48, returns"
          autoComplete="off"
          enterKeyHint="search"
          className="h-14 w-full rounded-xl border bg-card pr-4 pl-12 text-base shadow-xs outline-none placeholder:text-muted-foreground focus-visible:border-brand focus-visible:ring-2 focus-visible:ring-ring/40 sm:text-lg"
        />
      </div>

      {showList ? (
        <div id={listId} role="listbox" aria-labelledby={headingId} className="mt-2 overflow-hidden rounded-xl border bg-card" data-testid="ask-results" onMouseDown={(e) => e.preventDefault()}>
          {groups.map((g, gi) => {
            const Icon = groupIcon[g.id as keyof typeof groupIcon] ?? Newspaper;
            return (
              <div key={g.id} role="group" aria-labelledby={`${id}-g-${g.id}`} className="border-b py-1">
                <p id={`${id}-g-${g.id}`} className="px-4 pt-2 pb-1 text-xs font-medium text-muted-foreground">
                  {g.label}
                </p>
                {g.results.map((r, ri) => {
                  const i = starts[gi] + ri;
                  return (
                    <div
                      key={r.href}
                      id={optionId(i)}
                      role="option"
                      aria-selected={i === current}
                      onClick={() => openRow(i)}
                      onMouseMove={() => setActive(i)}
                      className={cn("flex min-h-11 cursor-pointer items-center gap-3 px-4 py-2 text-sm", i === current && "bg-secondary")}
                    >
                      <Icon className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-medium">{r.title}</span>
                        <span className="block truncate text-xs text-muted-foreground">{r.meta}</span>
                      </span>
                      {r.solved ? <CheckCircle2 className="size-4 shrink-0 text-success" aria-hidden="true" /> : null}
                    </div>
                  );
                })}
              </div>
            );
          })}
          {groups.length === 0 ? <p className="px-4 pt-3 pb-1 text-sm text-muted-foreground">{entries ? "Nothing matches yet." : "Searching."}</p> : null}
          {(() => {
            const i = rows.length - 1;
            return (
              <div
                id={optionId(i)}
                role="option"
                aria-selected={i === current}
                onClick={() => openRow(i)}
                onMouseMove={() => setActive(i)}
                className={cn("flex min-h-12 cursor-pointer items-center gap-3 px-4 py-2 text-sm", i === current && "bg-secondary")}
                data-testid="ask-community"
              >
                <MessageSquarePlus className="size-4 shrink-0 text-brand" aria-hidden="true" />
                <span className="min-w-0 flex-1">
                  <span className="font-medium">None of these? Ask the community</span>
                  <span className="block truncate text-xs text-muted-foreground">{signedIn ? `Start a thread titled "${trimmed}"` : `Join free, then post "${trimmed}"`}</span>
                </span>
              </div>
            );
          })()}
        </div>
      ) : null}
    </section>
  );
}
