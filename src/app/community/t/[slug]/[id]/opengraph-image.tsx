import { ImageResponse } from "next/og";
import { getTopicByShortId } from "@/lib/forum/queries";
import { displayName } from "@/lib/format";
import { siteConfig } from "@/lib/site";

export const alt = "Topic on The Sellers Network";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/* Social card: title, category, solved state, author. Colours are literal because this renders to PNG. */
export default async function Image({ params }: { params: Promise<{ slug: string; id: string }> }) {
  const { id } = await params;
  const data = await getTopicByShortId(id);
  const title = data?.topic.title ?? siteConfig.name;
  const category = data?.topic.category?.name ?? "";
  const author = data ? displayName(data.topic.author) : "";
  const solved = data?.topic.is_solved ?? false;

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: 64, background: "#ffffff", color: "#14342f", fontFamily: "sans-serif" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16, fontSize: 28, fontWeight: 600 }}>
          <div style={{ width: 14, height: 14, borderRadius: 7, background: "#0f766e" }} />
          {siteConfig.name}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {category ? <div style={{ fontSize: 26, color: "#5b6b69" }}>{category}</div> : null}
          <div style={{ fontSize: title.length > 80 ? 48 : 60, fontWeight: 700, lineHeight: 1.15, letterSpacing: -1 }}>{title}</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 26, color: "#5b6b69" }}>
          <span>{author ? `Asked by ${author}` : ""}</span>
          {solved ? <span style={{ color: "#1a7f37", fontWeight: 600 }}>Solved</span> : null}
        </div>
      </div>
    ),
    size,
  );
}
