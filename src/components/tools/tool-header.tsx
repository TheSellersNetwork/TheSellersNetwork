import Link from "next/link";

/* Shared heading for the pages under /tools, with a way back to the list. */
export function ToolHeader({ title, intro, children }: { title: string; intro: string; children?: React.ReactNode }) {
  return (
    <header className="mb-8">
      <nav aria-label="Breadcrumb" className="text-sm text-muted-foreground">
        <Link href="/tools" className="hover:underline">
          Tools
        </Link>
      </nav>
      <h1 className="mt-1 text-3xl font-semibold tracking-tight">{title}</h1>
      <p className="mt-2 max-w-2xl text-muted-foreground">{intro}</p>
      {children}
    </header>
  );
}
