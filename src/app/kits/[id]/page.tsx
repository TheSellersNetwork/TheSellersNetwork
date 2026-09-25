import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ExternalLink } from "lucide-react";
import { UserAvatar } from "@/components/forum/user-avatar";
import { KitCopyButton } from "@/components/kits/kit-copy-button";
import { Button } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/auth";
import { getKit } from "@/lib/forum/extras-queries";
import { kitKinds } from "@/lib/kits";
import { displayName, longDate } from "@/lib/format";
import { urls } from "@/lib/forum/urls";

export async function generateMetadata({ params }: PageProps<"/kits/[id]">): Promise<Metadata> {
  const { id } = await params;
  const kit = await getKit(id);
  if (!kit) return {};
  return { title: kit.title, description: kit.description ?? undefined, robots: kit.is_public ? undefined : { index: false } };
}

export default async function KitPage({ params }: PageProps<"/kits/[id]">) {
  const { id } = await params;
  const [kit, viewer] = await Promise.all([getKit(id), getCurrentUser()]);
  if (!kit) notFound();
  const own = viewer?.id === kit.user_id;
  const total = kit.items.reduce((n, i) => n + Number(i.price_paid ?? 0), 0);
  const kinds = new Map<string, string>(kitKinds.map((k) => [k.id, k.label]));

  return (
    <main id="main" className="mx-auto w-full max-w-3xl flex-1 px-4 py-10 sm:px-6">
      <p className="text-sm text-muted-foreground">
        <Link href="/kits" className="hover:underline">
          Setups
        </Link>
      </p>
      <div className="mt-2 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">{kit.title}</h1>
          <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
            <UserAvatar profile={kit.owner} size="sm" />
            {kit.owner ? (
              <Link href={urls.profile(kit.owner.username)} className="hover:underline">
                {displayName(kit.owner)}
              </Link>
            ) : (
              "Deleted member"
            )}
            <span>· updated {longDate(kit.updated_at).split(" at")[0]}</span>
            {kit.copy_count > 0 ? <span>· copied {kit.copy_count} times</span> : null}
          </div>
        </div>
        <div className="flex gap-2">
          {own ? (
            <Button asChild variant="outline">
              <Link href={`/kits/${kit.id}/edit`}>Edit</Link>
            </Button>
          ) : null}
          <KitCopyButton kitId={kit.id} signedIn={!!viewer} />
        </div>
      </div>
      {kit.description ? <p className="mt-4 max-w-prose whitespace-pre-line text-muted-foreground">{kit.description}</p> : null}

      <table className="mt-8 w-full text-sm">
        <thead className="text-left text-xs uppercase tracking-wide text-muted-foreground">
          <tr>
            <th className="py-2 font-medium">Item</th>
            <th className="py-2 font-medium">Type</th>
            <th className="py-2 text-right font-medium">Paid</th>
          </tr>
        </thead>
        <tbody>
          {kit.items.map((i) => (
            <tr key={i.id} className="border-t align-top">
              <td className="py-2.5 pr-3">
                <div className="font-medium">
                  {i.url ? (
                    <a href={i.url} rel="nofollow ugc noopener" className="hover:underline">
                      {i.name}
                      <ExternalLink className="ml-1 inline size-3 text-muted-foreground" aria-hidden="true" />
                    </a>
                  ) : (
                    i.name
                  )}
                </div>
                {i.bought_from ? <div className="text-xs text-muted-foreground">from {i.bought_from}</div> : null}
                {i.note ? <div className="mt-0.5 text-xs text-muted-foreground">{i.note}</div> : null}
              </td>
              <td className="py-2.5 pr-3 text-muted-foreground">{kinds.get(i.kind) ?? i.kind}</td>
              <td className="py-2.5 text-right tabular-nums">{i.price_paid != null ? `£${Number(i.price_paid).toFixed(2)}` : ""}</td>
            </tr>
          ))}
        </tbody>
        {total > 0 ? (
          <tfoot>
            <tr className="border-t font-semibold">
              <td className="py-2.5" colSpan={2}>
                Total
              </td>
              <td className="py-2.5 text-right tabular-nums">£{total.toFixed(2)}</td>
            </tr>
          </tfoot>
        ) : null}
      </table>
    </main>
  );
}
