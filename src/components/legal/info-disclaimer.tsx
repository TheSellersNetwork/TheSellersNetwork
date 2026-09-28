import Link from "next/link";
import { cn } from "@/lib/utils";

/* The standard note on guides, fee breakdowns and calculators. */
export function InfoDisclaimer({ className }: { className?: string }) {
  return (
    <p className={cn("rounded-lg border bg-secondary/40 p-3 text-xs text-muted-foreground", className)}>
      General information, not tax, legal or financial advice. Figures come from the official pages linked above and were correct when checked, but fees and rules change: check the official page before you rely on a figure, and speak to a qualified adviser about your own situation. See our{" "}
      <Link href="/terms#information-on-the-site" className="underline">
        terms
      </Link>
      .
    </p>
  );
}
