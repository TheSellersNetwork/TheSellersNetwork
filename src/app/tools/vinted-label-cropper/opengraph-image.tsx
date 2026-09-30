import { ogContentType, ogSize, shareImage } from "@/lib/og/card";

export const alt = "Vinted label cropper: print Vinted labels on 4x6, free";
export const size = ogSize;
export const contentType = ogContentType;

/* Vinted's own share card, so a link in a Vinted sellers' group says what the page does. */
export default function Image() {
  return shareImage({
    label: "Free tool",
    title: "Vinted label cropper",
    subtitle: "Crop a Vinted label PDF or screenshot to a 4x6 thermal label, A6 or A4 sheets. Runs in your browser.",
    meta: ["No sign-up", "Not affiliated with Vinted"],
  });
}
