import Link from "next/link";

/* Shared heading for the pages under /tools, with a way back to the list (and to the hub page, when there is one). */
export function ToolHeader({ title, intro, parent, children }: { title: string; intro: string; parent?: { href: string; label: string }; children?: React.ReactNode }) {
  return (
    <header className="mb-8">
      <nav aria-label="Breadcrumb" className="text-sm text-muted-foreground">
        <Link href="/tools" className="hover:underline">
          Tools
        </Link>
        {parent ? (
          <>
            <span aria-hidden="true"> / </span>
            <Link href={parent.href} className="hover:underline">
              {parent.label}
            </Link>
          </>
        ) : null}
      </nav>
      <h1 className="mt-1 text-3xl font-semibold tracking-tight">{title}</h1>
      <p className="mt-2 max-w-2xl text-muted-foreground">{intro}</p>
      {children}
    </header>
  );
}

/* The short explanation at the top of one tool on a page that holds several. */
export function ToolIntro({ children }: { children: React.ReactNode }) {
  return <p className="mb-6 max-w-2xl text-sm text-muted-foreground">{children}</p>;
}

/* A second tool further down the same page, with its own heading and an anchor to link to. */
export function ToolSection({ id, title, intro, children }: { id: string; title: string; intro: string; children: React.ReactNode }) {
  return (
    <section id={id} aria-labelledby={`${id}-heading`} className="mt-14 scroll-mt-20 border-t pt-10">
      <h2 id={`${id}-heading`} className="text-xl font-semibold tracking-tight">
        {title}
      </h2>
      <p className="mt-1 mb-6 max-w-2xl text-sm text-muted-foreground">{intro}</p>
      {children}
    </section>
  );
}
