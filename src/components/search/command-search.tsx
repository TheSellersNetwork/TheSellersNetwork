"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { BookOpen, CheckCircle2, Clock, MessageSquare, Newspaper, Search, Wrench, X } from "lucide-react";
import { Command, CommandDialog, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { OPEN_SEARCH_EVENT } from "@/components/search/open-search";
import { addRecent, parseRecent, search, type ForumHit, type IndexEntry, type SearchCatalogue } from "@/components/search/search-index";
import { urls } from "@/lib/forum/urls";

/*
  Site search palette. Opens with Ctrl+K (Cmd+K on a Mac), the header search
  box or the phone search button. Tools, guides and blog posts match instantly
  from a small index fetched once; forum threads come from the forum search
  after a short pause in typing. Recent searches stay in this browser only.
*/

const RECENT_KEY = "tsn-recent-searches";
const DEBOUNCE_MS = 250;

let cataloguePromise: Promise<IndexEntry[]> | null = null;

/* Fetches the index once per page load. A failure is not cached, so the next open tries again. */
export function loadCatalogue(): Promise<IndexEntry[]> {
  if (!cataloguePromise) {
    cataloguePromise = fetch("/api/search/catalogue")
      .then((r) => (r.ok ? (r.json() as Promise<SearchCatalogue>) : Promise.reject(new Error(String(r.status)))))
      .then((c) => c.entries)
      .catch((e) => {
        cataloguePromise = null;
        throw e;
      });
  }
  return cataloguePromise;
}

function readRecent(): string[] {
  try {
    return parseRecent(window.localStorage.getItem(RECENT_KEY));
  } catch {
    return [];
  }
}

function writeRecent(list: string[]) {
  try {
    window.localStorage.setItem(RECENT_KEY, JSON.stringify(list));
  } catch {
    // Private browsing or storage blocked: recent searches just are not kept.
  }
}

type ForumState = { query: string; status: "loading" | "done" | "error" | "limited"; results: ForumHit[] };

const kindIcon = { tool: Wrench, guide: BookOpen, post: Newspaper } as const;

export function CommandSearch() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [entries, setEntries] = useState<IndexEntry[] | null>(null);
  const [catalogueFailed, setCatalogueFailed] = useState(false);
  const [recent, setRecent] = useState<string[]>([]);
  const [forum, setForum] = useState<ForumState | null>(null);
  const requestId = useRef(0);
  const openRef = useRef(false);
  useEffect(() => {
    openRef.current = open;
  }, [open]);

  const show = useCallback((initial = "") => {
    setQuery(initial);
    setRecent(readRecent());
    setCatalogueFailed(false);
    setOpen(true);
    loadCatalogue().then(setEntries, () => setCatalogueFailed(true));
  }, []);

  // Ctrl+K or Cmd+K anywhere, and the open event from the header and phone buttons.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.defaultPrevented || e.altKey || e.shiftKey) return;
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        if (openRef.current) setOpen(false);
        else show();
      }
    }
    function onOpen(e: Event) {
      show((e as CustomEvent<{ query?: string }>).detail?.query ?? "");
    }
    window.addEventListener("keydown", onKey);
    window.addEventListener(OPEN_SEARCH_EVENT, onOpen);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener(OPEN_SEARCH_EVENT, onOpen);
    };
  }, [show]);

  // Forum threads, after a short pause in typing. Older answers are dropped if a newer search started.
  const trimmed = query.trim();
  useEffect(() => {
    if (!open || trimmed.length < 2) return;
    const id = ++requestId.current;
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setForum({ query: trimmed, status: "loading", results: [] });
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(trimmed)}`, { signal: controller.signal });
        const body = (await res.json()) as { results?: ForumHit[] };
        if (id !== requestId.current) return;
        setForum({ query: trimmed, status: res.status === 429 ? "limited" : res.ok ? "done" : "error", results: body.results ?? [] });
      } catch (e) {
        if (id === requestId.current && !(e instanceof DOMException && e.name === "AbortError")) setForum({ query: trimmed, status: "error", results: [] });
      }
    }, DEBOUNCE_MS);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [trimmed, open]);

  const tools = useMemo(() => (entries ? (trimmed ? search(entries, trimmed, "tool", 5) : entries.filter((e) => e.kind === "tool").slice(0, 6)) : []), [entries, trimmed]);
  const reading = useMemo(() => (entries && trimmed ? search(entries, trimmed, ["guide", "post"], 6) : []), [entries, trimmed]);
  const threads = forum && forum.query === trimmed ? forum : null;

  /*
    The highlighted row. Results arrive at different times (the index, then
    the forum), so whenever the top row changes the highlight moves back to
    it; Enter then always opens the best match rather than a row that
    happened to be first a moment ago.
  */
  const firstValue = !trimmed
    ? recent.length > 0
      ? `recent:${recent[0]}`
      : tools[0]
        ? `tool:${tools[0].href}`
        : ""
    : tools[0]
      ? `tool:${tools[0].href}`
      : reading[0]
        ? `${reading[0].kind}:${reading[0].href}`
        : threads?.results[0]
          ? `thread:${threads.results[0].href}`
          : "see-all";
  const [selected, setSelected] = useState("");
  const [shownFirst, setShownFirst] = useState("");
  if (firstValue !== shownFirst) {
    setShownFirst(firstValue);
    setSelected(firstValue);
  }

  function go(href: string) {
    if (trimmed.length >= 2) {
      const next = addRecent(readRecent(), trimmed);
      writeRecent(next);
      setRecent(next);
    }
    setOpen(false);
    router.push(href);
  }

  function clearRecent() {
    writeRecent([]);
    setRecent([]);
  }

  // A clearer highlight than the default, which barely shows on the dark theme.
  const itemCls = "min-h-11 gap-3 py-2 sm:min-h-0 data-selected:bg-secondary data-selected:shadow-[inset_2px_0_0_var(--brand)]";

  return (
    <CommandDialog
      open={open}
      onOpenChange={setOpen}
      title="Search"
      description="Search tools, guides, the blog and forum threads"
      className="top-3! sm:top-[12vh]! sm:max-w-xl!"
    >
      <Command shouldFilter={false} loop label="Search the site" value={selected} onValueChange={setSelected}>
        <CommandInput value={query} onValueChange={setQuery} placeholder="Search tools, guides and the forum" aria-label="Search tools, guides and the forum" />
        <CommandList className="max-h-[min(65dvh,30rem)]!">
          {!trimmed && recent.length > 0 ? (
            <CommandGroup heading="Recent searches">
              {recent.map((r) => (
                <CommandItem key={r} value={`recent:${r}`} onSelect={() => setQuery(r)} className={itemCls}>
                  <Clock className="text-muted-foreground" aria-hidden="true" />
                  <span className="truncate">{r}</span>
                </CommandItem>
              ))}
              <CommandItem value="recent:clear" onSelect={clearRecent} className={`${itemCls} text-muted-foreground`}>
                <X aria-hidden="true" />
                Clear recent searches
              </CommandItem>
            </CommandGroup>
          ) : null}

          {entries === null && !catalogueFailed ? <p className="px-3 py-4 text-sm text-muted-foreground">Loading search</p> : null}
          {catalogueFailed ? <p className="px-3 py-4 text-sm text-muted-foreground">Tools and guides could not be loaded. Forum search still works.</p> : null}

          {tools.length > 0 ? (
            <CommandGroup heading="Tools">
              {tools.map((e) => (
                <ResultItem key={e.href} entry={e} onSelect={() => go(e.href)} className={itemCls} />
              ))}
            </CommandGroup>
          ) : null}

          {reading.length > 0 ? (
            <CommandGroup heading="Guides and blog">
              {reading.map((e) => (
                <ResultItem key={e.href} entry={e} onSelect={() => go(e.href)} className={itemCls} />
              ))}
            </CommandGroup>
          ) : null}

          {trimmed.length >= 2 ? (
            <CommandGroup heading="Forum threads">
              <div aria-live="polite" className="sr-only">
                {threads?.status === "done" ? `${threads.results.length} forum threads found` : ""}
              </div>
              {!threads || threads.status === "loading" ? <p className="px-2 py-2 text-sm text-muted-foreground">Searching the forum</p> : null}
              {threads?.status === "done" && threads.results.length === 0 ? <p className="px-2 py-2 text-sm text-muted-foreground">No threads matched.</p> : null}
              {threads?.status === "error" ? <p className="px-2 py-2 text-sm text-muted-foreground">The forum search did not answer. Try See all results.</p> : null}
              {threads?.status === "limited" ? <p className="px-2 py-2 text-sm text-muted-foreground">Too many searches. Wait a minute and try again.</p> : null}
              {threads?.results.map((t) => (
                <CommandItem key={t.href} value={`thread:${t.href}`} onSelect={() => go(t.href)} className={itemCls}>
                  <MessageSquare className="text-muted-foreground" aria-hidden="true" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate">{t.title}</span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {[t.forum, t.replies === 1 ? "1 reply" : `${t.replies} replies`].filter(Boolean).join(", ")}
                    </span>
                  </span>
                  {t.solved ? (
                    <span className="flex shrink-0 items-center gap-1 text-xs text-success">
                      <CheckCircle2 className="size-3.5" aria-hidden="true" />
                      Solved
                    </span>
                  ) : null}
                </CommandItem>
              ))}
            </CommandGroup>
          ) : null}

          {trimmed ? (
            <CommandGroup>
              <CommandItem value="see-all" onSelect={() => go(urls.search(trimmed))} className={itemCls}>
                <Search aria-hidden="true" />
                <span className="truncate">
                  See all results for &ldquo;{trimmed}&rdquo;
                </span>
              </CommandItem>
            </CommandGroup>
          ) : null}
        </CommandList>
        <div className="hidden items-center gap-4 border-t px-3 py-2 text-xs text-muted-foreground sm:flex" aria-hidden="true">
          <span>
            <Kbd>↑</Kbd> <Kbd>↓</Kbd> to move
          </span>
          <span>
            <Kbd>Enter</Kbd> to open
          </span>
          <span>
            <Kbd>Esc</Kbd> to close
          </span>
        </div>
      </Command>
    </CommandDialog>
  );
}

function ResultItem({ entry, onSelect, className }: { entry: IndexEntry; onSelect: () => void; className: string }) {
  const Icon = kindIcon[entry.kind];
  return (
    <CommandItem value={`${entry.kind}:${entry.href}`} onSelect={onSelect} className={className}>
      <Icon className="text-muted-foreground" aria-hidden="true" />
      <span className="min-w-0 flex-1">
        <span className="block truncate">{entry.title}</span>
        <span className="block truncate text-xs text-muted-foreground">{entry.text}</span>
      </span>
      <span className="hidden shrink-0 rounded-full bg-secondary px-2 py-0.5 text-xs text-muted-foreground sm:inline">{entry.label}</span>
    </CommandItem>
  );
}

function Kbd({ children }: { children: React.ReactNode }) {
  return <kbd className="rounded border bg-secondary px-1.5 py-0.5 font-sans text-[11px]">{children}</kbd>;
}
