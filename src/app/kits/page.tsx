import type { Metadata } from "next";
import Link from "next/link";
import { Copy } from "lucide-react";
import { UserAvatar } from "@/components/forum/user-avatar";
import { Button } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/auth";
import { getKitsForUser, getPublicKits } from "@/lib/forum/extras-queries";
import { displayName, plural, timeAgo } from "@/lib/format";
import { urls } from "@/lib/forum/urls";

export const metadata: Metadata = {
  title: "Setups",
  description: "What members use to run their reselling: printers, scales, packaging, software, with real prices paid.",
  alternates: { canonical: "/kits" },
};

export default async function KitsPage() {
  const viewer = await getCurrentUser();
  const [kits, mine] = await Promise.all([getPublicKits(30), viewer ? getKitsForUser(viewer.id) : Promise.resolve([])]);

  return (
    <main id="main" className="mx-auto w-full max-w-5xl flex-1 px-4 py-10 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Setups</h1>
          <p className="mt-2 max-w-2xl text-muted-foreground">What members actually use: label printer, scales, packaging, software, and what they paid. Copy one and change it to suit.</p>
        </div>
        <Button asChild>
          <Link href={viewer ? "/kits/new" : urls.login("/kits/new")}>Add your setup</Link>
        </Button>
      </div>

      {mine.length > 0 ? (
        <section className="mt-8">
          <h2 className="text-lg font-semibold">Your setups</h2>
          <ul className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {mine.map((k) => (
              <KitCard key={k.id} kit={k} />
            ))}
          </ul>
        </section>
      ) : null}

      <section className="mt-10">
        <h2 className="text-lg font-semibold">Members&rsquo; setups</h2>
        {kits.length === 0 ? (
          <p className="mt-3 rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">No setups shared yet. Be the first.</p>
        ) : (
          <ul className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {kits.map((k) => (
              <KitCard key={k.id} kit={k} />
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}

function KitCard({ kit }: { kit: Awaited<ReturnType<typeof getPublicKits>>[number] }) {
  return (
    <li className="forum-card row-enter rounded-xl border bg-card p-4">
      <Link href={`/kits/${kit.id}`} className="font-semibold leading-snug hover:underline">
        {kit.title}
      </Link>
      {!kit.is_public ? <span className="ml-2 rounded bg-secondary px-1.5 py-0.5 text-[10px]">private</span> : null}
      <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{kit.description ?? ""}</p>
      <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
        <UserAvatar profile={kit.owner} size="xs" />
        <span className="truncate">{displayName(kit.owner)}</span>
        <span className="ml-auto flex shrink-0 items-center gap-2">
          {plural(kit.item_count, "item")}
          {kit.copy_count > 0 ? (
            <span className="inline-flex items-center gap-0.5">
              <Copy className="size-3" aria-hidden="true" /> {kit.copy_count}
            </span>
          ) : null}
          <span>{timeAgo(kit.updated_at)}</span>
        </span>
      </div>
    </li>
  );
}
