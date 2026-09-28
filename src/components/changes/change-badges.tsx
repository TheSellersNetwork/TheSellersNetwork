import { CalendarClock, CheckCircle2, Megaphone } from "lucide-react";
import { effectiveStatus, formatChangeDate, impactLabels, platformColours, platformLabels, type ChangeMeta } from "@/lib/tools/changes";
import { cn } from "@/lib/utils";

export function PlatformChip({ platform, className }: { platform: ChangeMeta["platform"]; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full border bg-card px-2.5 py-0.5 text-xs font-medium", className)}>
      <span className="size-2 rounded-full" style={{ background: `var(--cat-${platformColours[platform]})` }} aria-hidden="true" />
      {platformLabels[platform]}
    </span>
  );
}

export function ImpactBadge({ impact }: { impact: ChangeMeta["impact"] }) {
  return (
    <span
      className={cn(
        "rounded-full px-2.5 py-0.5 text-xs font-medium",
        impact === "high" ? "bg-destructive/15 text-destructive" : impact === "medium" ? "bg-brand/15 text-brand" : "bg-secondary text-muted-foreground",
      )}
    >
      {impactLabels[impact]}
    </span>
  );
}

function daysFrom(date: string, today: Date) {
  return Math.round((Date.parse(`${date}T00:00:00Z`) - Date.parse(`${today.toISOString().slice(0, 10)}T00:00:00Z`)) / 86_400_000);
}

/* "In effect since", "Starts in 12 days" or "Announced, no start date yet". */
export function StatusBadge({ change, today = new Date() }: { change: Pick<ChangeMeta, "status" | "date">; today?: Date }) {
  const status = effectiveStatus(change, today);
  if (status === "announced") {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
        <Megaphone className="size-3.5" aria-hidden="true" /> Announced {formatChangeDate(change.date)}, no start date yet
      </span>
    );
  }
  if (status === "coming") {
    const days = daysFrom(change.date, today);
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-destructive">
        <CalendarClock className="size-3.5" aria-hidden="true" /> Starts {formatChangeDate(change.date)} · in {days} {days === 1 ? "day" : "days"}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
      <CheckCircle2 className="size-3.5 text-success" aria-hidden="true" /> In effect since {formatChangeDate(change.date)}
    </span>
  );
}
