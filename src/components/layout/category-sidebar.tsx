import Link from "next/link";
import { Hash } from "lucide-react";
import { getCategories, groupCategories } from "@/lib/forum/queries";
import { getCategoryUnread } from "@/lib/forum/live-queries";
import { getCurrentUser } from "@/lib/auth";
import { CommunityNav } from "@/components/layout/community-nav";
import { urls } from "@/lib/forum/urls";
import { cn } from "@/lib/utils";

export async function CategorySidebar({ active, activeNav = "all" }: { active: string | null; activeNav?: string }) {
  const [all, viewer] = await Promise.all([getCategories(), getCurrentUser()]);
  const categories = groupCategories(all);
  const unread = viewer ? await getCategoryUnread() : new Map<string, number>();
  const unreadFor = (id: string, childIds: string[] = []) => (unread.get(id) ?? 0) + childIds.reduce((n, c) => n + (unread.get(c) ?? 0), 0);

  return (
    <aside className="hidden lg:block" aria-label="Categories">
      <nav className="category-sidebar sticky top-[calc(var(--header-height)+1.5rem)] max-h-[calc(100vh-var(--header-height)-2rem)] space-y-5 overflow-y-auto pr-1 text-sm">
        <CommunityNav active={active ? "category" : activeNav} />
        <h2 className="px-2 text-xs font-semibold uppercase tracking-wide sidebar-muted">Forums</h2>
        {categories.map((parent) => (
          <div key={parent.id}>
            <Link
              href={urls.category(parent.slug)}
              className={cn(
                "flex items-center gap-2 rounded-md px-2 py-1 font-medium",
                active === parent.slug && "sidebar-active",
              )}
            >
              <span className="sidebar-bar h-4 w-1 rounded-full" style={{ background: `var(--cat-${parent.colour})` }} aria-hidden="true" />
              <span className="flex-1">{parent.name}</span>
              {unreadFor(parent.id, parent.children.map((c) => c.id)) > 0 && parent.children.length === 0 ? (
                <span className="unread-pill" aria-label={`${unreadFor(parent.id)} unread`}>{unreadFor(parent.id)}</span>
              ) : null}
            </Link>
            {parent.children.length > 0 ? (
              <ul className="mt-1 space-y-0.5 border-l pl-3 ml-2.5">
                {parent.children.map((child) => (
                  <li key={child.id}>
                    <Link
                      href={urls.category(child.slug)}
                      className={cn(
                        "sidebar-muted flex items-center gap-1.5 rounded-md px-2 py-1",
                        active === child.slug && "sidebar-active",
                        (unread.get(child.id) ?? 0) > 0 && "font-semibold text-foreground",
                      )}
                    >
                      <Hash className="size-3.5 shrink-0 opacity-60" aria-hidden="true" />
                      <span className="flex-1">{child.name}</span>
                      {(unread.get(child.id) ?? 0) > 0 ? (
                        <span className="unread-pill" aria-label={`${unread.get(child.id)} unread`}>{unread.get(child.id)}</span>
                      ) : null}
                    </Link>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        ))}
      </nav>
    </aside>
  );
}
