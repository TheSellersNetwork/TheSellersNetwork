import Link from "next/link";
import { MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getRelatedThreads } from "@/lib/content/related-threads";
import { urls } from "@/lib/forum/urls";
import { plural } from "@/lib/format";

/*
  Shown by the label cropper on the Vinted page only after a download has
  worked, so it never gets in the way of the tool. The three newest public
  threads in the Vinted forum (the same cached, cookie-free query the guides
  use); the list hides when there are none. Signed-in members who press Join
  are sent straight on to the forum by the sign-up page.
*/
export async function VintedJoinCard() {
  const { threads } = await getRelatedThreads(["vinted"]);
  const forum = urls.category("vinted");
  const recent = threads.slice(0, 3);
  return (
    <section aria-labelledby="vinted-join-heading" className="rounded-xl border bg-card p-4 text-sm sm:p-5" data-testid="vinted-join-card">
      <h2 id="vinted-join-heading" className="text-base font-semibold">
        Sell on Vinted? Get answers from other sellers
      </h2>
      <p className="mt-1 text-muted-foreground">Carrier problems, low offers, claims and what sells. Ask in the Vinted forum, free.</p>
      {recent.length > 0 ? (
        <ul className="mt-3 divide-y" aria-label="Recent threads in the Vinted forum">
          {recent.map((t) => (
            <li key={t.id} className="py-2">
              <Link href={urls.topic(t)} className="block min-h-11 font-medium leading-snug hover:underline sm:min-h-0">
                {t.title}
              </Link>
              <span className="mt-0.5 inline-flex items-center gap-1 text-xs text-muted-foreground">
                <MessageSquare className="size-3.5" aria-hidden="true" />
                {plural(t.reply_count, "reply", "replies")}
              </span>
            </li>
          ))}
        </ul>
      ) : null}
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <Button asChild className="max-sm:h-11">
          <Link href={`${urls.signup()}?next=${encodeURIComponent(forum)}`}>Join free</Link>
        </Button>
        <Link href={forum} className="inline-flex min-h-11 items-center text-brand underline-offset-4 hover:underline sm:min-h-0">
          Read the Vinted forum
        </Link>
      </div>
    </section>
  );
}
