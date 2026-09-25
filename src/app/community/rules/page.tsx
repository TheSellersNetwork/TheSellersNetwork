import type { Metadata } from "next";
import { ForumShell } from "@/components/layout/forum-shell";
import { houseRules } from "@/content/house-rules";
import { urls } from "@/lib/forum/urls";

export const metadata: Metadata = {
  title: "House rules",
  description: "The six rules of The Sellers Network community.",
  alternates: { canonical: urls.rules() },
};

export default function RulesPage() {
  return (
    <ForumShell source={urls.rules()}>
      <article className="measure">
        <h1 className="text-2xl font-semibold tracking-tight">House rules</h1>
        <p className="mt-2 text-muted-foreground">[TOM: one paragraph on why the rules exist and how they are applied]</p>
        <ol className="mt-6 space-y-4">
          {houseRules.map((rule, i) => (
            <li key={rule.title} className="flex gap-4 rounded-lg border bg-card p-4">
              <span className="grid size-7 shrink-0 place-items-center rounded-full bg-secondary text-sm font-semibold">{i + 1}</span>
              <div>
                <h2 className="font-semibold">{rule.title}</h2>
                <p className="text-sm text-muted-foreground">{rule.body}</p>
              </div>
            </li>
          ))}
        </ol>
        <h2 className="mt-10 text-lg font-semibold">What happens when a rule is broken</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Posts can be flagged by members and are reviewed by staff. Breaches lead to a warning, then a three day silence, then a
          thirty day suspension, then a permanent one. Every action comes with a reason you can read.
        </p>
      </article>
    </ForumShell>
  );
}
