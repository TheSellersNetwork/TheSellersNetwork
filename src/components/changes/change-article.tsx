import Link from "next/link";
import { ExternalLink, MessageCircle, MessagesSquare } from "lucide-react";
import { Mdx } from "@/components/content/mdx";
import { ImpactBadge, PlatformChip, StatusBadge } from "@/components/changes/change-badges";
import { InfoDisclaimer } from "@/components/legal/info-disclaimer";
import { DebatePoll } from "@/components/content/debate-poll";
import { ReadingProgress } from "@/components/content/reading-progress";
import { UserAvatar } from "@/components/forum/user-avatar";
import { EmailSignupCard } from "@/components/marketing/email-signup-card";
import { ArticleJsonLd, BreadcrumbJsonLd } from "@/components/seo/json-ld";
import { getChanges, type Change } from "@/lib/content/changes";
import { getAuthor } from "@/lib/content/authors";
import { getGuides } from "@/lib/content/guides";
import { getChangeDiscussion } from "@/lib/forum/change-discussions";
import { getCategories } from "@/lib/forum/queries";
import { getCurrentUser } from "@/lib/auth";
import { excerpt } from "@/lib/markdown/render";
import { displayName, plural, readingTime, timeAgo } from "@/lib/format";
import { formatChangeDate, impactLabels, platformLabels } from "@/lib/tools/changes";
import { urls } from "@/lib/forum/urls";
import { siteConfig } from "@/lib/site";

/*
  A fee or policy change written up as a blog post: byline, plain-English
  breakdown, then the discussion thread, poll and sources. Rendered by
  /blog/[slug] for files in content/changes.
*/
export async function ChangeArticle({ change }: { change: Change }) {
  const author = getAuthor(change.author, change.platform);
  const url = urls.blogPost(change.slug);

  const viewer = await getCurrentUser();
  const [discussion, allChanges, guides, categories] = await Promise.all([
    getChangeDiscussion(change.discussion, viewer?.id),
    getChanges(),
    getGuides(),
    getCategories(),
  ]);
  const forum = categories.find((c) => c.slug === change.forum) ?? null;
  const relatedGuides = guides.filter((g) => change.guides.includes(g.slug));
  const related = allChanges.filter((c) => c.slug !== change.slug && c.platform === change.platform).slice(0, 3);
  const topicUrl = discussion ? urls.topic(discussion.topic) : null;
  const joinUrl = topicUrl ? (viewer ? `${topicUrl}#reply` : urls.login(topicUrl)) : urls.newTopic(change.forum);

  return (
    <main id="main" className="mx-auto w-full max-w-6xl flex-1 px-4 py-10 sm:px-6">
      <BreadcrumbJsonLd items={[{ name: "Blog", url: urls.blog() }, { name: change.title, url }]} />
      <ArticleJsonLd title={change.title} description={change.summary} url={url} datePublished={change.announced ?? change.date} author={{ name: author.name, url: siteConfig.url }} />

      <nav aria-label="Breadcrumb" className="text-sm text-muted-foreground">
        <Link href={urls.blog()} className="hover:underline">
          Blog
        </Link>
        {" / "}
        <Link href={`${urls.blog()}?type=changes`} className="hover:underline">
          Fee and policy changes
        </Link>
      </nav>

      <header className="mt-3 max-w-3xl">
        <div className="flex flex-wrap items-center gap-2">
          <PlatformChip platform={change.platform} />
          <ImpactBadge impact={change.impact} />
          <StatusBadge change={change} />
        </div>
        <h1 className="mt-3 text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">{change.title}</h1>
        <p className="mt-3 text-lg text-muted-foreground">{change.summary}</p>
        <p className="mt-4 flex items-center gap-3 text-sm">
          <span className="flex size-9 items-center justify-center rounded-full bg-brand/15 text-xs font-semibold text-brand" aria-hidden="true">
            {author.initials}
          </span>
          <span>
            <span className="font-medium">By {author.name}</span>
            <span className="block text-xs text-muted-foreground">
              {readingTime(change.content)} min read ·{" "}
              <Link href="/about#who-writes-what" className="underline">
                a pen name for our staff writers
              </Link>
            </span>
          </span>
        </p>
        {change.affects.length > 0 ? (
          <div className="mt-4 flex flex-wrap items-center gap-2 text-sm">
            <span className="text-muted-foreground">Affects:</span>
            {change.affects.map((a) => (
              <span key={a} className="rounded-md bg-secondary px-2 py-0.5">
                {a}
              </span>
            ))}
          </div>
        ) : null}
      </header>

      <ReadingProgress targetId="article-body" />
      <div className="mt-8 grid gap-10 lg:grid-cols-[minmax(0,1fr)_300px]">
        <article id="article-body">
          <div data-glossary className="prose prose-neutral max-w-none measure dark:prose-invert prose-a:text-brand">
            <Mdx source={change.content} anchors />
          </div>

          <section aria-labelledby="talk-heading" className="mt-12 rounded-xl border-2 border-brand/40 bg-card p-5">
            <h2 id="talk-heading" className="flex items-center gap-2 text-xl font-semibold">
              <MessagesSquare className="size-5 text-brand" aria-hidden="true" /> What do you make of it?
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Official pages tell you the rule. Other sellers tell you what it actually did to their numbers. Pick a question and answer it in{" "}
              {discussion ? "the discussion thread" : forum ? forum.name : "the forum"}.
            </p>
            {change.questions.length > 0 ? (
              <ul className="mt-4 grid gap-2 sm:grid-cols-2">
                {change.questions.map((q) => (
                  <li key={q}>
                    <Link href={joinUrl} className="flex h-full items-start gap-2 rounded-lg border bg-background p-3 text-sm hover:border-brand/60">
                      <MessageCircle className="mt-0.5 size-4 shrink-0 text-brand" aria-hidden="true" />
                      {q}
                    </Link>
                  </li>
                ))}
              </ul>
            ) : null}

            {discussion && discussion.latest.length > 0 ? (
              <div className="mt-6">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Latest from the thread</h3>
                <ul className="mt-2 space-y-3">
                  {discussion.latest.map((p) => (
                    <li key={p.id} className="flex gap-3 text-sm">
                      {p.is_anonymous ? <span className="size-7 shrink-0 rounded-full bg-secondary" aria-hidden="true" /> : <UserAvatar profile={p.author} size="sm" />}
                      <div className="min-w-0">
                        <p className="text-xs text-muted-foreground">
                          <span className="font-medium text-foreground">{p.is_anonymous ? "Anonymous member" : displayName(p.author)}</span> · {timeAgo(p.created_at)} ago
                        </p>
                        <Link href={urls.topic(discussion.topic, p.post_number)} className="line-clamp-3 hover:underline">
                          {excerpt(p.body_md, 220)}
                        </Link>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <Link href={joinUrl} className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/85">
                <MessageCircle className="size-4" aria-hidden="true" />
                {discussion ? (discussion.replies > 0 ? "Join the discussion" : "Be the first to reply") : "Start the discussion"}
              </Link>
              {discussion && discussion.replies > 0 ? (
                <Link href={topicUrl!} className="text-sm text-muted-foreground underline">
                  Read all {plural(discussion.replies, "reply", "replies")}
                </Link>
              ) : null}
            </div>
          </section>

          <InfoDisclaimer className="mt-10" />

          <section aria-labelledby="sources-heading" className="mt-10">
            <h2 id="sources-heading" className="text-lg font-semibold">
              Sources
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">We write these breakdowns from the official pages below. If anything here disagrees with them, the official page wins, and tell us in the thread.</p>
            <ul className="mt-3 space-y-1 text-sm">
              {[{ title: "Official announcement", url: change.source }, ...change.sources].map((s) => (
                <li key={s.url}>
                  <a href={s.url} target="_blank" rel="noopener" className="inline-flex items-center gap-1 underline">
                    {s.title} <ExternalLink className="size-3" aria-hidden="true" />
                  </a>
                </li>
              ))}
            </ul>
          </section>

          <div className="mt-10">
            <EmailSignupCard source={url} variant="inline" />
          </div>
        </article>

        <aside className="space-y-6 lg:sticky lg:top-20 lg:self-start">
          <section aria-labelledby="glance-heading" className="forum-card rounded-xl border bg-card p-4 text-sm">
            <h2 id="glance-heading" className="font-semibold">
              At a glance
            </h2>
            <dl className="mt-3 space-y-2">
              <Row label="Platform" value={platformLabels[change.platform]} />
              <Row label={change.status === "announced" ? "Announced" : "Takes effect"} value={formatChangeDate(change.date)} />
              {change.announced && change.announced !== change.date ? <Row label="Announced" value={formatChangeDate(change.announced)} /> : null}
              <Row label="How big" value={impactLabels[change.impact]} />
            </dl>
            <a href={change.source} target="_blank" rel="noopener" className="mt-3 inline-flex items-center gap-1 text-xs underline">
              Read the official announcement <ExternalLink className="size-3" aria-hidden="true" />
            </a>
          </section>

          {discussion?.poll ? <DebatePoll poll={discussion.poll} signedIn={!!viewer} returnTo={url} headingLevel={2} /> : null}

          {relatedGuides.length > 0 ? (
            <section aria-labelledby="guides-heading" className="rounded-xl border bg-card p-4 text-sm">
              <h2 id="guides-heading" className="font-semibold">
                Related guides
              </h2>
              <ul className="mt-2 space-y-2">
                {relatedGuides.map((g) => (
                  <li key={g.slug}>
                    <Link href={urls.guide(g.slug)} className="underline">
                      {g.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {related.length > 0 ? (
            <section aria-labelledby="related-heading" className="rounded-xl border bg-card p-4 text-sm">
              <h2 id="related-heading" className="font-semibold">
                More {platformLabels[change.platform]} changes
              </h2>
              <ul className="mt-2 space-y-3">
                {related.map((c) => (
                  <li key={c.slug}>
                    <Link href={urls.blogPost(c.slug)} className="font-medium hover:underline">
                      {c.title}
                    </Link>
                    <p className="text-xs text-muted-foreground">{formatChangeDate(c.date)}</p>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </aside>
      </div>
    </main>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right font-medium">{value}</dd>
    </div>
  );
}
