import Link from "next/link";
import { getCategories, groupCategories } from "@/lib/forum/queries";
import { urls } from "@/lib/forum/urls";
import { cn } from "@/lib/utils";

export async function CategorySidebar({ active }: { active: string | null }) {
  const categories = groupCategories(await getCategories());

  return (
    <aside className="hidden lg:block" aria-label="Categories">
      <nav className="category-sidebar sticky top-[calc(var(--header-height)+1.5rem)] space-y-5 text-sm">
        <Link
          href={urls.community()}
          className={cn("block rounded-md px-2 py-1 font-medium", active === null && "sidebar-active")}
        >
          All categories
        </Link>
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
              {parent.name}
            </Link>
            {parent.children.length > 0 ? (
              <ul className="mt-1 space-y-0.5 border-l pl-3 ml-2.5">
                {parent.children.map((child) => (
                  <li key={child.id}>
                    <Link
                      href={urls.category(child.slug)}
                      className={cn(
                        "sidebar-muted block rounded-md px-2 py-1",
                        active === child.slug && "sidebar-active",
                      )}
                    >
                      {child.name}
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
