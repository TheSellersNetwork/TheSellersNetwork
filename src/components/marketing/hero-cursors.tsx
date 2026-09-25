"use client";

/*
  The little name tags that float around the headline, like collaborators'
  cursors. Names are real recent members (or "You" when there are too few),
  and the drift is a slow CSS animation that stops under reduced motion.
*/
const positions = [
  { top: "-6%", right: "8%", delay: "0s", colour: "var(--brand)" },
  { top: "42%", right: "-4%", delay: "1.2s", colour: "#16a34a" },
  { top: "78%", left: "38%", delay: "2.1s", colour: "#7c3aed" },
];

export function HeroCursors({ names }: { names: string[] }) {
  const labels = [...names.slice(0, 2), "You"].slice(0, 3);
  return (
    <div className="pointer-events-none absolute inset-0 hidden lg:block" aria-hidden="true">
      {labels.map((name, i) => (
        <span
          key={`${name}-${i}`}
          className="hero-cursor absolute flex items-start gap-0.5"
          style={{ ...positions[i], animationDelay: positions[i].delay }}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill={positions[i].colour} className="mt-1">
            <path d="M1 1l4.5 12 2-5 5-2z" />
          </svg>
          <span className="rounded-full px-2 py-0.5 text-xs font-medium text-white" style={{ background: positions[i].colour }}>
            {name}
          </span>
        </span>
      ))}
    </div>
  );
}
