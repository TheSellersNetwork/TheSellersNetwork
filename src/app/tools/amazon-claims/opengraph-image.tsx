import { ogContentType, ogSize } from "@/lib/og/card";
import { toolImage } from "@/lib/og/tool-image";

export const alt = "Free tool on The Sellers Network";
export const size = ogSize;
export const contentType = ogContentType;

export default function Image() {
  return toolImage("/tools/amazon-claims");
}
