import { ogContentType, ogSize } from "@/lib/og/card";
import { toolImage } from "@/lib/og/tool-image";

export const alt = "Shipping label cropper, a free tool on The Sellers Network";
export const size = ogSize;
export const contentType = ogContentType;

export default function Image() {
  return toolImage("/tools/label-cropper");
}
