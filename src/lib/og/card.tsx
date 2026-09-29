import { ImageResponse } from "next/og";
import { siteConfig } from "@/lib/site";
import { ogPalette as c } from "@/lib/og/palette";
import { clip, titleFontSize } from "@/lib/og/labels";

/*
  The share card every page uses: 1200 by 630, the dark slate brand colours,
  the nodes mark and wordmark, a type label, a title and a line of detail.
  Renders with next/og's bundled font (Geist), as the site's Inter is only
  available as a web font. Nothing here is invented: callers pass real titles,
  dates and figures, and leave out what they do not have.
*/

export const ogSize = { width: 1200, height: 630 };
export const ogContentType = "image/png";

export type CardStat = { label: string; value: string; highlight?: boolean };
export type CardRow = { name: string; value: string; note?: string };

export type CardProps = {
  /* Short type label shown top right, such as "Guide" or "Comparison". */
  label?: string | null;
  title: string;
  /* A second line under the title, such as a debate's poll question. */
  subtitle?: string | null;
  /* Small facts along the bottom, such as the author and date. */
  meta?: (string | null | undefined | false)[];
  /* Up to three figures in boxes (fee calculator results). */
  stats?: CardStat[];
  /* A short ranked list (fee comparison). */
  rows?: CardRow[];
};

function host(): string {
  try {
    return new URL(siteConfig.url).host.replace(/^www\./, "");
  } catch {
    return "";
  }
}

function Mark() {
  return (
    <svg width="44" height="44" viewBox="0 0 32 32" fill="none">
      <path d="M9 22.5 16 9.5m0 0 7 13M9 22.5h14" stroke={c.foreground} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="16" cy="9.5" r="3.5" fill={c.brand} />
      <circle cx="9" cy="22.5" r="3.5" fill={c.foreground} />
      <circle cx="23" cy="22.5" r="3.5" fill={c.foreground} />
    </svg>
  );
}

export function ShareCard({ label, title, subtitle, meta, stats, rows }: CardProps) {
  const heading = clip(title, 120);
  const dense = (stats && stats.length > 0) || (rows && rows.length > 0);
  const size = dense ? Math.min(titleFontSize(heading), 52) : titleFontSize(heading);
  const facts = (meta ?? []).filter((m): m is string => typeof m === "string" && m.length > 0);
  const domain = host();

  return (
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", background: c.background, color: c.foreground, padding: "56px 72px", fontFamily: "sans-serif" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16, fontSize: 30 }}>
          <Mark />
          <span>{siteConfig.name}</span>
        </div>
        {label ? (
          <div style={{ display: "flex", fontSize: 26, color: c.brandText, background: c.brandSoft, border: `2px solid ${c.border}`, borderRadius: 999, padding: "8px 22px" }}>{label}</div>
        ) : null}
      </div>

      <div style={{ display: "flex", flexDirection: "column", flexGrow: 1, justifyContent: "center", gap: 22 }}>
        <div style={{ display: "flex", fontSize: size, lineHeight: 1.12, letterSpacing: -1, maxWidth: 1050 }}>{heading}</div>
        {subtitle ? <div style={{ display: "flex", fontSize: 32, lineHeight: 1.3, color: c.muted, maxWidth: 1000 }}>{clip(subtitle, 150)}</div> : null}
        {stats && stats.length > 0 ? (
          <div style={{ display: "flex", gap: 20, marginTop: 8 }}>
            {stats.slice(0, 3).map((s) => (
              <div key={s.label} style={{ display: "flex", flexDirection: "column", gap: 6, background: c.card, border: `2px solid ${c.border}`, borderRadius: 16, padding: "18px 26px", minWidth: 250 }}>
                <span style={{ fontSize: 24, color: c.muted }}>{s.label}</span>
                <span style={{ fontSize: 44, color: s.highlight ? c.brandText : c.foreground }}>{s.value}</span>
              </div>
            ))}
          </div>
        ) : null}
        {rows && rows.length > 0 ? (
          <div style={{ display: "flex", flexDirection: "column", marginTop: 4, border: `2px solid ${c.border}`, borderRadius: 16, background: c.card }}>
            {rows.map((r, i) => (
              <div key={r.name} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 26px", fontSize: 28, borderTop: i === 0 ? "none" : `2px solid ${c.border}` }}>
                <span style={{ display: "flex", gap: 16 }}>
                  <span style={{ color: c.muted, width: 28 }}>{i + 1}</span>
                  <span>{r.name}</span>
                </span>
                <span style={{ display: "flex", gap: 22 }}>
                  {r.note ? <span style={{ color: c.muted }}>{r.note}</span> : null}
                  <span>{r.value}</span>
                </span>
              </div>
            ))}
          </div>
        ) : null}
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 26, color: c.muted }}>
        <span style={{ display: "flex", gap: 14 }}>
          {facts.map((f, i) => (
            <span key={f} style={{ display: "flex", gap: 14 }}>
              {i > 0 ? <span style={{ color: c.border }}>|</span> : null}
              <span>{f}</span>
            </span>
          ))}
        </span>
        <span>{domain}</span>
      </div>
    </div>
  );
}

export function shareImage(props: CardProps, init?: { headers?: Record<string, string> }): ImageResponse {
  return new ImageResponse(<ShareCard {...props} />, { ...ogSize, headers: init?.headers });
}
