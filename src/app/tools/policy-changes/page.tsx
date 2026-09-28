import { permanentRedirect } from "next/navigation";

/* The tracker grew into the blog's fee and policy changes section. */
export default function PolicyChangesRedirect() {
  permanentRedirect("/blog?type=changes");
}
