"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import { isNumericColumn, sortRowIndexes, type SortDirection } from "@/lib/content/table-sort";
import { cn } from "@/lib/utils";

export type DataTableCell = { content: React.ReactNode; text: string; align?: "left" | "center" | "right" };
export type DataTableRow = { cells: DataTableCell[]; picked: boolean };

const alignClass = { left: "text-left", center: "text-center", right: "text-right" } as const;

/*
  A markdown table in a post. Scrolls sideways with the first column held in
  place and a soft edge shadow while there is more to see; headers sort the
  rows. Under 640px each row becomes a card with the header as a label.
  Rows naming the post's pick are highlighted with "Our pick".
*/
export function DataTable({ headers, rows }: { headers: DataTableCell[]; rows: DataTableRow[] }) {
  const id = useId();
  const scroller = useRef<HTMLDivElement>(null);
  const [sort, setSort] = useState<{ col: number; dir: SortDirection } | null>(null);
  const [edge, setEdge] = useState({ left: false, right: false });
  const sortable = rows.length >= 3;

  const columns = useMemo(() => headers.map((_, c) => rows.map((r) => r.cells[c]?.text ?? "")), [headers, rows]);
  const numeric = useMemo(() => columns.map((values) => isNumericColumn(values)), [columns]);
  const order = useMemo(() => (sort ? sortRowIndexes(columns[sort.col] ?? [], sort.dir) : rows.map((_, i) => i)), [sort, columns, rows]);

  const measure = useCallback(() => {
    const el = scroller.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    setEdge({ left: el.scrollLeft > 1, right: max > 1 && el.scrollLeft < max - 1 });
  }, []);

  useEffect(() => {
    measure();
    const el = scroller.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [measure]);

  function toggle(col: number) {
    setSort((s) => (s?.col === col ? { col, dir: s.dir === "ascending" ? "descending" : "ascending" } : { col, dir: "ascending" }));
  }

  const scrollable = edge.left || edge.right;

  return (
    <div className="not-prose my-8" data-table>
      {sortable ? (
        <div className="mb-3 flex items-center gap-2 text-sm sm:hidden">
          <label htmlFor={`${id}-sort`} className="text-muted-foreground">
            Sort by
          </label>
          <select
            id={`${id}-sort`}
            className="min-h-11 min-w-0 flex-1 rounded-md border bg-card px-2 text-sm"
            value={sort ? `${sort.col}:${sort.dir}` : ""}
            onChange={(e) => {
              const [col, dir] = e.target.value.split(":");
              setSort(e.target.value ? { col: Number(col), dir: dir as SortDirection } : null);
            }}
          >
            <option value="">Original order</option>
            {headers.map((h, c) =>
              (["ascending", "descending"] as const).map((dir) => (
                <option key={`${c}:${dir}`} value={`${c}:${dir}`}>
                  {h.text}, {numeric[c] ? (dir === "ascending" ? "lowest first" : "highest first") : dir === "ascending" ? "A to Z" : "Z to A"}
                </option>
              )),
            )}
          </select>
        </div>
      ) : null}
      <div className="relative">
        <div
          ref={scroller}
          onScroll={measure}
          role={scrollable ? "region" : undefined}
          aria-label={scrollable ? "Table. Scroll sideways to see every column." : undefined}
          tabIndex={scrollable ? 0 : undefined}
          className="rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:overflow-x-auto sm:border"
        >
          <table role="table" className="w-full border-collapse text-sm max-sm:block">
            <thead role="rowgroup" className="max-sm:sr-only">
              <tr role="row">
                {headers.map((h, c) => {
                  const active = sort?.col === c;
                  return (
                    <th
                      key={c}
                      role="columnheader"
                      scope="col"
                      aria-sort={active ? sort.dir : undefined}
                      className={cn(
                        "border-b bg-secondary px-3 py-2 align-bottom font-semibold",
                        alignClass[h.align ?? "left"],
                        c === 0 && "sticky left-0 z-10 border-r",
                      )}
                    >
                      {sortable ? (
                        <button
                          type="button"
                          onClick={() => toggle(c)}
                          className={cn(
                            "-mx-1 inline-flex min-h-8 items-center gap-1 rounded px-1 text-left font-semibold hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                            h.align === "right" && "flex-row-reverse",
                          )}
                        >
                          <span>{h.content}</span>
                          {active ? (
                            sort.dir === "ascending" ? (
                              <ArrowUp className="size-3.5 shrink-0 text-brand" aria-hidden="true" />
                            ) : (
                              <ArrowDown className="size-3.5 shrink-0 text-brand" aria-hidden="true" />
                            )
                          ) : (
                            <ArrowUpDown className="size-3.5 shrink-0 text-muted-foreground/70" aria-hidden="true" />
                          )}
                          <span className="sr-only">{active ? `, sorted ${sort.dir}` : ", sort"}</span>
                        </button>
                      ) : (
                        h.content
                      )}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody role="rowgroup" className="max-sm:block max-sm:space-y-3">
              {order.map((r) => {
                const row = rows[r];
                return (
                  <tr
                    key={r}
                    role="row"
                    data-picked={row.picked ? "" : undefined}
                    className={cn(
                      "max-sm:block max-sm:rounded-lg max-sm:border max-sm:p-3",
                      row.picked ? "bg-brand-soft max-sm:border-brand/60" : "bg-card",
                    )}
                  >
                    {row.cells.map((cell, c) =>
                      c === 0 ? (
                        <th
                          key={c}
                          role="rowheader"
                          scope="row"
                          className={cn(
                            "border-b px-3 py-2 text-left align-top font-medium sm:min-w-36 max-sm:block max-sm:border-0 max-sm:p-0 max-sm:pb-2 max-sm:text-base sm:sticky sm:left-0 sm:z-[1] sm:border-r",
                            row.picked ? "bg-brand-soft shadow-[inset_3px_0_0_var(--brand)] max-sm:shadow-none" : "bg-card",
                          )}
                        >
                          <span className="[&_a]:text-brand [&_a]:underline [&_a]:underline-offset-2">{cell.content}</span>
                          {row.picked ? (
                            <span className="ml-2 inline-flex items-center whitespace-nowrap rounded-full border border-brand/60 bg-card px-2 py-0.5 align-middle text-[11px] font-medium text-brand">
                              Our pick
                            </span>
                          ) : null}
                        </th>
                      ) : (
                        <td
                          key={c}
                          role="cell"
                          className={cn(
                            "border-b px-3 py-2 align-top sm:min-w-32 max-sm:grid max-sm:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] max-sm:gap-3 max-sm:border-0 max-sm:border-t max-sm:px-0 max-sm:text-left",
                            alignClass[cell.align ?? "left"],
                            numeric[c] && "tabular-nums",
                          )}
                        >
                          <span className="text-xs text-muted-foreground sm:hidden" aria-hidden="true">
                            {headers[c]?.text}
                          </span>
                          <span className="[&_a]:text-brand [&_a]:underline [&_a]:underline-offset-2">{cell.content}</span>
                        </td>
                      ),
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <span
          aria-hidden="true"
          className={cn(
            "pointer-events-none absolute inset-y-px right-px hidden w-4 rounded-r-lg shadow-[inset_-12px_0_10px_-10px_color-mix(in_oklab,var(--foreground)_28%,transparent)] transition-opacity duration-200 motion-reduce:transition-none sm:block",
            edge.right ? "opacity-100" : "opacity-0",
          )}
        />
      </div>
    </div>
  );
}
