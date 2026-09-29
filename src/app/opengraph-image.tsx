import { shareImage, ogContentType, ogSize } from "@/lib/og/card";
import { siteConfig } from "@/lib/site";

export const alt = siteConfig.name;
export const size = ogSize;
export const contentType = ogContentType;

/* The default share card, used by any page without one of its own. */
export default function Image() {
  return shareImage({ title: "A free forum for people who buy and sell for profit in the UK", meta: ["Forum", "Guides", "Tools"] });
}
