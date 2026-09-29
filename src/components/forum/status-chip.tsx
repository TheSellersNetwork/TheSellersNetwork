import { CheckCircle2, CircleDot, Lock, MessageSquare } from "lucide-react";
import { statusHints, statusLabels, topicStatus, type TopicStatus } from "@/lib/forum/status";
import { cn } from "@/lib/utils";

const styles: Record<TopicStatus, string> = {
  open: "border-border text-muted-foreground",
  answered: "border-transparent bg-brand-soft text-brand-deep",
  solved: "border-success/30 bg-success/10 text-success",
  closed: "border-transparent bg-secondary text-muted-foreground",
};

const icons = { open: CircleDot, answered: MessageSquare, solved: CheckCircle2, closed: Lock } as const;

/* Open, Answered, Solved or Closed, from the topic's own columns. */
export function StatusChip({ topic, size = "sm", className }: { topic: { reply_count: number; is_solved: boolean; is_locked: boolean }; size?: "sm" | "md"; className?: string }) {
  const status = topicStatus(topic);
  const Icon = icons[status];
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1 rounded-full border font-medium leading-none",
        size === "sm" ? "px-1.5 py-0.5 text-[11px]" : "px-2 py-1 text-xs",
        styles[status],
        className,
      )}
      title={statusHints[status]}
      data-status={status}
      data-testid="status-chip"
    >
      <Icon className={size === "sm" ? "size-3" : "size-3.5"} aria-hidden="true" />
      {statusLabels[status]}
    </span>
  );
}
