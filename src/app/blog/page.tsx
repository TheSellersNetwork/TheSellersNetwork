import type { Metadata } from "next";
import Link from "next/link";
import { getBlogPosts, type BlogPlatform } from "@/lib/content/blog";
import { urls } from "@/lib/forum/urls";
import { readingTime } from "@/lib/format";
import { format } from "date-fns";
import { enGB } from "date-fns/locale";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Blog",
  description: "Guides, real-numbers case studies and the weekly forum roundup for UK resellers.",
  alternates: { canonical: urls.blog() },
};

const filters: { id: BlogPlatform | "all"; label: string }[] = [
  { id: "all", label: "All" },
  { id: "ebay", label: "eBay" },
  { id: "amazon", label: "Amazon" },
  { id: "vinted", label: "Vinted" },
  { id: "etsy", label: "Etsy" },
  { id: "other", label: "Other" },
];

export default async function BlogPage({ searchParams }: PageProps<"/blog">) {
  const sp = await searchParams;
  const filter = filters.find((f) => f.id === sp.platform)?.id ?? "all";
  const posts = (await getBlogPosts()).filter((p) => filter === "all" || p.platforms.includes(filter));

  return (
    <main id="main" className="mx-auto w-full max-w-6xl flex-1 px-4 py-10 sm:px-6">
      <h1 className="font-serif text-3xl font-semibold tracking-tight sm:text-4xl">The Sellers Network blog</h1>
      <p className="mt-2 max-w-2xl text-muted-foreground">Guides, case studies with real numbers, and a roundup of the week on the forum.</p>
      <nav aria-label="Filter by platform" className="mt-6 flex flex-wrap gap-1">
        {filters.map((f) => (
          <Link
            key={f.id}
            href={f.id === "all" ? urls.blog() : `${urls.blog()}?platform=${f.id}`}
            aria-current={filter === f.id ? "page" : undefined}
            className={cn("rounded-full border px-3 py-1 text-sm", filter === f.id ? "border-foreground bg-foreground text-background" : "hover:bg-secondary")}
          >
            {f.label}
          </Link>
        ))}
      </nav>
      {posts.length === 0 ? (
        <p className="mt-10 rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">Nothing published yet. The forums are the place to be in the meantime.</p>
      ) : (
        <ul className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {posts.map((post) => (
            <li key={post.slug} className="flex flex-col rounded-lg border bg-card p-5">
              <div className="flex flex-wrap gap-1 text-xs text-muted-foreground">
                {post.platforms.map((p) => (
                  <span key={p} className="rounded bg-secondary px-1.5 py-0.5 capitalize">
                    {p}
                  </span>
                ))}
              </div>
              <h2 className="mt-3 font-serif text-xl font-semibold leading-snug">
                <Link href={urls.blogPost(post.slug)} className="hover:underline">
                  {post.title}
                </Link>
              </h2>
              <p className="mt-2 flex-1 text-sm text-muted-foreground">{post.excerpt}</p>
              <p className="mt-4 text-xs text-muted-foreground">
                {post.published ? format(new Date(post.published), "d MMMM yyyy", { locale: enGB }) : "Draft"}
              </p>
            </li>
          ))}
        </ul>
      )}
      <p className="sr-only">{readingTime("")}</p>
    </main>
  );
}
