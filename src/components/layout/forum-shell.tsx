import { CategorySidebar } from "@/components/layout/category-sidebar";
import { RightRail } from "@/components/layout/right-rail";

type Props = {
  children: React.ReactNode;
  /* Extra rail content placed above the defaults. */
  rail?: React.ReactNode;
  /* Slug of the category being viewed, to highlight it. */
  activeCategory?: string | null;
  /* Hide the category sidebar, for example on the composer. */
  hideSidebar?: boolean;
  /* Source page recorded with email signups from the rail. */
  source?: string;
  /* Which sidebar link is current: all, latest, following, unanswered, top. */
  activeNav?: string;
};

/*
  Three columns on desktop: categories, content, right rail. Single column on
  mobile, where the category list lives inside /community itself.
*/
export function ForumShell({ children, rail, activeCategory, hideSidebar, source, activeNav }: Props) {
  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6">
      <div className="grid gap-8 lg:grid-cols-[var(--sidebar-width)_minmax(0,1fr)] xl:grid-cols-[var(--sidebar-width)_minmax(0,1fr)_var(--rail-width)]">
        {hideSidebar ? <div className="hidden lg:block" /> : <CategorySidebar active={activeCategory ?? null} activeNav={activeNav} />}
        <main id="main" className="min-w-0">
          {children}
        </main>
        <RightRail source={source}>{rail}</RightRail>
      </div>
    </div>
  );
}
