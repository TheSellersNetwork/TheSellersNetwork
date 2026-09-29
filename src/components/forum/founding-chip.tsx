import { Sprout } from "lucide-react";

/* Shown next to members who joined in the first months. Earned by date, never assigned. */
export function FoundingChip() {
  return (
    <span className="inline-flex items-center gap-1 rounded border border-success/40 px-1.5 py-0.5 text-xs text-success" title="Joined in the first months of the forum">
      <Sprout className="size-3" aria-hidden="true" />
      Founding member
    </span>
  );
}
