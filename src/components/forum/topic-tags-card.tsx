import Link from "next/link";
import { TagFollowButton } from "@/components/forum/tag-follow-button";
import { urls } from "@/lib/forum/urls";

type Props = {
  tags: { id: string; slug: string; name: string }[];
  followed: Set<string>;
  signedIn: boolean;
};

/* Topic sidebar: each tag on the topic with a Follow button. */
export function TopicTagsCard({ tags, followed, signedIn }: Props) {
  if (tags.length === 0) return null;
  return (
    <section aria-labelledby="topic-tags-heading" className="forum-card rail-card rounded-lg border bg-card p-4 text-sm" data-testid="topic-tags-card">
      <h2 id="topic-tags-heading" className="text-sm font-semibold">
        Tags on this topic
      </h2>
      <p className="mt-1 text-xs text-muted-foreground">Follow a tag to hear about new topics with it.</p>
      <ul className="mt-3 space-y-2">
        {tags.map((t) => (
          <li key={t.id} className="flex items-center justify-between gap-2">
            <Link href={urls.tag(t.slug)} className="min-w-0 truncate rounded bg-secondary px-1.5 py-0.5 hover:underline">
              {t.name}
            </Link>
            <TagFollowButton tagId={t.id} tagName={t.name} following={followed.has(t.id)} signedIn={signedIn} compact />
          </li>
        ))}
      </ul>
    </section>
  );
}
