import { cn } from "@/lib/utils";

/*
  Wordmark-led logo. Three mark options and a wordmark-only option, so Tom can
  pick one at /brand. The mark inherits currentColor so it works on any palette
  and in dark mode; the accent dot uses the brand colour.

  Marks:
    nodes    three connected nodes in a triangle, the "network" reading
    ascend   three nodes climbing left to right, network plus growth
    chevron  a single upward chevron, quieter and more editorial
    none     wordmark only
*/

export type LogoMark = "nodes" | "ascend" | "chevron" | "none";

type MarkProps = { className?: string };

export function NodesMark({ className }: MarkProps) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true" fill="none">
      <path
        d="M9 22.5 16 9.5m0 0 7 13M9 22.5h14"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="16" cy="9.5" r="3.5" fill="var(--brand)" />
      <circle cx="9" cy="22.5" r="3.5" fill="currentColor" />
      <circle cx="23" cy="22.5" r="3.5" fill="currentColor" />
    </svg>
  );
}

export function AscendMark({ className }: MarkProps) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true" fill="none">
      <path
        d="M7 24 16 15.5 25 7"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="7" cy="24" r="3.5" fill="currentColor" />
      <circle cx="16" cy="15.5" r="3.5" fill="currentColor" />
      <circle cx="25" cy="7" r="3.5" fill="var(--brand)" />
    </svg>
  );
}

export function ChevronMark({ className }: MarkProps) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true" fill="none">
      <path
        d="M6 21 16 10l10 11"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M11 25.5 16 20l5 5.5"
        stroke="var(--brand)"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

const marks: Record<Exclude<LogoMark, "none">, (p: MarkProps) => React.JSX.Element> = {
  nodes: NodesMark,
  ascend: AscendMark,
  chevron: ChevronMark,
};

type LogoProps = {
  mark?: LogoMark;
  /* Height of the lockup in pixels. The wordmark scales with it. */
  size?: number;
  className?: string;
};

export function Logo({ mark = "nodes", size = 24, className }: LogoProps) {
  const Mark = mark === "none" ? null : marks[mark];
  return (
    <span
      className={cn("inline-flex items-center gap-2", className)}
      style={{ height: size }}
    >
      {Mark ? <Mark className="h-full w-auto shrink-0" /> : null}
      <span
        className="font-sans font-semibold tracking-tight whitespace-nowrap leading-none"
        style={{ fontSize: size * 0.78 }}
      >
        The Sellers Network
      </span>
    </span>
  );
}
