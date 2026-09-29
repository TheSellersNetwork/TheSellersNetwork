import { shareImage, ogContentType, ogSize } from "@/lib/og/card";

export const alt = "Free tools for UK resellers";
export const size = ogSize;
export const contentType = ogContentType;

export default function Image() {
  return shareImage({ label: "Free tools", title: "Free tools for UK resellers", meta: ["No sign-up"] });
}
