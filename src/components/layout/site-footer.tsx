import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { urls } from "@/lib/forum/urls";
import { siteConfig } from "@/lib/site";
import { CookieSettingsLink } from "@/components/cookie-banner";

const columns = [
  {
    heading: "Community",
    links: [
      { href: urls.community(), label: "Forum" },
      { href: urls.rules(), label: "House rules" },
      { href: "/kits", label: "Setups" },
      { href: urls.search(), label: "Search" },
    ],
  },
  {
    heading: "Read",
    links: [
      { href: urls.guides(), label: "Guides" },
      { href: urls.blog(), label: "Blog" },
      { href: "/newsletter", label: "Newsletter" },
      { href: "/tools", label: "Tools" },
      { href: "/tools/postage?tab=size", label: "Parcel size checker" },
      { href: "/blog?type=changes", label: "Fee and policy changes" },
    ],
  },
  {
    heading: "More",
    links: [
      { href: "/partners", label: "Partners" },
      { href: "/about", label: "About" },
      { href: "/contact", label: "Contact" },
      { href: "/report", label: "Report content" },
    ],
  },
  {
    heading: "Legal",
    links: [
      { href: "/privacy", label: "Privacy" },
      { href: "/terms", label: "Terms" },
      { href: "/cookies", label: "Cookies" },
      { href: "/accessibility", label: "Accessibility" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t bg-card">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:px-6 md:grid-cols-[1.5fr_repeat(4,1fr)]">
        <div>
          <Logo size={20} />
          <p className="mt-3 max-w-xs text-sm text-muted-foreground">A free forum for people who buy and sell for profit in the UK.</p>
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
          <p>
            The Sellers Network, {new Date().getFullYear()}.
            {siteConfig.legal.operator ? ` Run by ${siteConfig.legal.operator}.` : ""}
            {siteConfig.legal.address ? ` ${siteConfig.legal.address}.` : ""}
            {siteConfig.legal.companyNumber ? ` Company number ${siteConfig.legal.companyNumber}.` : ""}{" "}
            <CookieSettingsLink className="underline hover:text-foreground" />
          </p>
        </div>
      </div>
    </footer>
  );
}
