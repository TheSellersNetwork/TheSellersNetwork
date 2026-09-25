import Link from "next/link";
import { Bell, Compass, HelpCircle, Info, LayoutGrid, MessageSquare, Sparkles, Tag } from "lucide-react";
import { getPopularTags } from "@/lib/forum/overview-queries";
import { getCategories } from "@/lib/forum/queries";
import { urls } from "@/lib/forum/urls";
import { cn } from "@/lib/utils";

const links = [
  { href: urls.community(), label: "All forums", icon: LayoutGrid, key: "all" },
  { href: `${urls.community()}?view=latest`, label: "New posts", icon: MessageSquare, key: "latest" },
  { href: `${urls.community()}?view=following`, label: "Following", icon: Bell, key: "following" },
  { href: `${urls.community()}?view=unanswered`, label: "Needs an answer", icon: HelpCircle, key: "unanswered" },
  { href: `${urls.community()}?view=top`, label: "Top this week", icon: Sparkles, key: "top" },
  { href: "/partners", label: "Partners", icon: Compass, key: "partners" },
  { href: "/about", label: "About", icon: Info, key: "about" },
];

/*
  The top of the left sidebar: the main ways in, then popular tags. Until
  tags exist (Phase B) the busiest categories fill the same slot.
*/
export async function CommunityNav({ active }: { active: string }) {
  const [tags, categories] = await Promise.all([getPopularTags(6), getCategories()]);
  const popular = tags.length > 0 ? tags.map((t) => ({ href: `${urls.search(t.name)}`, label: `#${t.slug}`, count: `${t.topic_count} topics` })) : categories.filter((c) => c.parent_id).sort((a, b) => b.post_count - a.post_count).slice(0, 6).map((c) => ({ href: urls.category(c.slug), label: c.name, count: `${c.post_count} posts` }));

  return (
    <div className="space-y-6">
      <ul className="space-y-0.5">
        {links.map((l) => (
          <li key={l.key}>
            <Link href={l.href} className={cn("flex items-center gap-2.5 rounded-md px-2 py-1.5 font-medium", active === l.key && "sidebar-active")} aria-current={active === l.key ? "page" : undefined}>
              <l.icon className="size-4 opacity-70" aria-hidden="true" />
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
      {popular.length > 0 ? (
        <div>
          <div className="flex items-center justify-between px-2">
            <h2 className="text-xs font-semibold uppercase tracking-wide sidebar-muted">{tags.length > 0 ? "Popular tags" : "Busiest forums"}</h2>
          </div>
          <ul className="mt-1.5 space-y-0.5">
            {popular.map((p) => (
              <li key={p.href}>
                <Link href={p.href} className="flex items-center gap-2.5 rounded-md px-2 py-1">
                  <span className="grid size-7 shrink-0 place-items-center rounded-full bg-secondary">
                    <Tag className="size-3.5 opacity-70" aria-hidden="true" />
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium">{p.label}</span>
                    <span className="block text-xs sidebar-muted">{p.count}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
