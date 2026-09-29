import Link from "next/link";
import { CheckCircle2, MessageSquare, PenSquare } from "lucide-react";
import { getRelatedThreads } from "@/lib/content/related-threads";
import { urls } from "@/lib/forum/urls";
import { plural } from "@/lib/format";

/*
  "Recent questions about this" at the end of a guide: the newest public
  threads from the forums the guide is filed under. Hidden when there are none.
*/
export async function RelatedThreads({ categories }: { categories: string[] }) {
  const { threads, askCategory } = await getRelatedThreads(categories);
  if (threads.length === 0) return null;
  return (
    <section aria-labelledby="related-threads-heading" className="mt-10 rounded-xl border bg-card p-4 sm:p-5 print:hidden" data-testid="related-threads">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="related-threads-heading" className="text-lg font-semibold tracking-tight">
          Recent questions about this
        </h2>
        <Link href={urls.newTopic(askCategory ?? undefined)} className="inline-flex min-h-11 items-center gap-1.5 text-sm text-brand underline-offset-4 hover:underline sm:min-h-0">
          <PenSquare className="size-4" aria-hidden="true" />
          Ask the forum
        </Link>
      </div>
      <ul className="mt-3 divide-y">
        {threads.map((t) => (
          <li key={t.id} className="flex items-start gap-3 py-2.5">
            <div className="min-w-0 flex-1">
              <Link href={urls.topic(t)} className="block min-h-11 font-medium leading-snug hover:underline sm:min-h-0">
                {t.title}
              </Link>
              <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                <span>{t.category.name}</span>
                <span className="inline-flex items-center gap-1">
                  <MessageSquare className="size-3.5" aria-hidden="true" />
                  {plural(t.reply_count, "reply", "replies")}
                </span>
                {t.is_solved ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5 text-success" data-testid="solved-chip">
                    <CheckCircle2 className="size-3.5" aria-hidden="true" />
                    Solved
                  </span>
                ) : null}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
