import { shareImage, ogContentType, ogSize } from "@/lib/og/card";
import { getBlogPost } from "@/lib/content/blog";
import { getChange } from "@/lib/content/changes";
import { getAuthor } from "@/lib/content/authors";
import { postTypeLabel, ukLongDate } from "@/lib/og/labels";
import { siteConfig } from "@/lib/site";

export const alt = "Blog post on The Sellers Network";
export const size = ogSize;
export const contentType = ogContentType;

/*
  Share card for a blog post: type, title, byline and date ("Updated" when the
  post has been revised). Debates show their poll question. Fee and policy
  change breakdowns share this address, so they are handled here too. A post
  that is not live yet gets the plain site card, as getBlogPost hides it.
*/
export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const change = await getChange(slug);
  if (change) {
    const date = ukLongDate(change.announced ?? change.date);
    return shareImage({ label: "Fee and policy change", title: change.title, meta: [getAuthor(change.author).name, date ? `Announced ${date}` : null] });
  }

  const post = await getBlogPost(slug);
  if (!post) return shareImage({ title: siteConfig.name });
  const updated = ukLongDate(post.updated);
  const published = ukLongDate(post.published);
  return shareImage({
    label: postTypeLabel(post.category, post.slug),
    title: post.title,
    subtitle: post.debate ? post.debate.question : null,
    meta: [post.author ? getAuthor(post.author).name : siteConfig.name, updated ? `Updated ${updated}` : published],
  });
}
