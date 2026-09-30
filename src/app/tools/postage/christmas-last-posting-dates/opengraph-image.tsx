import postingData from "../../../../../content/christmas-posting.json";
import { ogContentType, ogSize, shareImage } from "@/lib/og/card";
import { cutOffs, readPostingData } from "@/lib/tools/christmas-posting";

const data = readPostingData(postingData);

export const alt = `Christmas last posting dates ${data.year} for UK sellers`;
export const size = ogSize;
export const contentType = ogContentType;

/* The year comes from the data file, so the card is right each year without editing. */
export default function Image() {
  const known = cutOffs(data).length > 0;
  return shareImage({
    label: "Free tool",
    title: `Christmas last posting dates ${data.year}`,
    subtitle: "Royal Mail, Parcelforce, Evri, InPost and DPD, from each carrier's own website, with a countdown to the next cut-off.",
    meta: [known ? null : "Dates added as carriers announce them", "For UK sellers"],
  });
}
