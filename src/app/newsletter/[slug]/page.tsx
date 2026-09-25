import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { EmailSignupCard } from "@/components/marketing/email-signup-card";
import { getIssue } from "@/lib/forum/home-queries";
import { renderMarkdown } from "@/lib/markdown/render";
import { longDate } from "@/lib/format";

export async function generateMetadata({ params }: PageProps<"/newsletter/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const issue = await getIssue(slug);
  if (!issue) return {};
  return { title: issue.subject, description: issue.preview_text ?? undefined, alternates: { canonical: `/newsletter/${issue.slug}` } };
}

export default async function IssuePage({ params }: PageProps<"/newsletter/[slug]">) {
  const { slug } = await params;
  const issue = await getIssue(slug);
  if (!issue) notFound();
  const html = issue.body_html ?? (await renderMarkdown(issue.body_md));
  return (
    <main id="main" className="mx-auto w-full max-w-3xl flex-1 px-4 py-10 sm:px-6">
      <p className="text-sm text-muted-foreground">
        <Link href="/newsletter" className="hover:underline">
          Newsletter
        </Link>{" "}
        · {longDate(issue.sent_at).split(" at")[0]}
      </p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">{issue.subject}</h1>
      <div className="post-body prose prose-neutral mt-8 max-w-none measure dark:prose-invert prose-a:text-brand" dangerouslySetInnerHTML={{ __html: html }} />
      <div className="mt-12">
        <EmailSignupCard source={`/newsletter/${issue.slug}`} variant="inline" />
      </div>
    </main>
  );
}
