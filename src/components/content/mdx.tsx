import Link from "next/link";
import { MDXRemote } from "next-mdx-remote/rsc";
import remarkGfm from "remark-gfm";
import rehypeSlug from "rehype-slug";
import { EmailSignupCard } from "@/components/marketing/email-signup-card";

/*
  Renders MDX content from the repo (guides, blog posts, course modules).
  Only a small set of components is exposed so Tom's copy stays plain.
*/
const components = {
  a: (props: React.ComponentProps<"a">) => {
    const href = props.href ?? "";
    if (href.startsWith("/")) return <Link href={href}>{props.children}</Link>;
    return <a {...props} rel="noopener" />;
  },
  Signup: ({ source }: { source: string }) => <EmailSignupCard source={source} variant="inline" className="not-prose my-8" />,
  Placeholder: ({ children }: { children: React.ReactNode }) => (
    <p className="not-prose my-4 rounded-md border border-dashed bg-secondary px-3 py-2 text-sm text-muted-foreground">[TOM: {children}]</p>
  ),
};

export function Mdx({ source }: { source: string }) {
  return (
    <MDXRemote
      source={source}
      components={components}
      options={{ mdxOptions: { remarkPlugins: [remarkGfm], rehypePlugins: [rehypeSlug] } }}
    />
  );
}

export function TableOfContents({ headings }: { headings: { depth: number; text: string; id: string }[] }) {
  if (headings.length < 2) return null;
  return (
    <nav aria-label="Contents" className="rounded-lg border bg-card p-4 text-sm">
      <h2 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Contents</h2>
      <ol className="mt-2 space-y-1">
        {headings.map((h) => (
          <li key={h.id} className={h.depth === 3 ? "pl-3" : ""}>
            <a href={`#${h.id}`} className="text-muted-foreground hover:text-foreground hover:underline">
              {h.text}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}
