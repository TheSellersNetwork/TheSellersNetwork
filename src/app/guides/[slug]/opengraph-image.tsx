import { shareImage, ogContentType, ogSize } from "@/lib/og/card";
import { getGuide } from "@/lib/content/guides";
import { siteConfig } from "@/lib/site";

export const alt = "Guide on The Sellers Network";
export const size = ogSize;
export const contentType = ogContentType;

/* Share card for a guide: its title, labelled Guide. */
export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const guide = await getGuide(slug);
  if (!guide || (!guide.published && process.env.NODE_ENV === "production")) return shareImage({ title: siteConfig.name });
  return shareImage({ label: "Guide", title: guide.title });
}
