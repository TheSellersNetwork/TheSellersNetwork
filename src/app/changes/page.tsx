import { permanentRedirect } from "next/navigation";

/* Change breakdowns moved into the blog. */
export default function OldChangesRedirect() {
  permanentRedirect("/blog?type=changes");
}
