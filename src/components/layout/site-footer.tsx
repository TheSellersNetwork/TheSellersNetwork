import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { urls } from "@/lib/forum/urls";

const columns = [
  {
    heading: "Community",
    links: [
      { href: urls.community(), label: "Forum" },
      { href: urls.rules(), label: "House rules" },
      { href: urls.search(), label: "Search" },
    ],
  },
  {
    heading: "Learn",
    links: [
      { href: urls.guides(), label: "Guides" },
      { href: urls.blog(), label: "Blog" },
      { href: "/course", label: "Course" },
    ],
  },
  {
    heading: "Work with Tom",
    links: [
      { href: "/mentoring", label: "Mentoring" },
      { href: "/autopilot", label: "Autopilot" },
      { href: "/partners", label: "Partners" },
      { href: "/about", label: "About" },
    ],
  },
  {
    heading: "Legal",
    links: [
      { href: "/privacy", label: "Privacy" },
      { href: "/terms", label: "Terms" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t bg-card">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:px-6 md:grid-cols-[1.5fr_repeat(4,1fr)]">
        <div>
          <Logo size={20} />
          <p className="mt-3 max-w-xs text-sm text-muted-foreground">[TOM: one-line footer description]</p>
        </div>
        {columns.map((col) => (
          <nav key={col.heading} aria-label={col.heading}>
            <h2 className="text-sm font-semibold">{col.heading}</h2>
            <ul className="mt-3 space-y-2">
              {col.links.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="text-sm text-muted-foreground hover:text-foreground hover:underline">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>
      <div className="border-t">
        <div className="mx-auto max-w-7xl px-4 py-4 text-xs text-muted-foreground sm:px-6">
          The Sellers Network, {new Date().getFullYear()}. [TOM: company details if required]
        </div>
      </div>
    </footer>
  );
}
