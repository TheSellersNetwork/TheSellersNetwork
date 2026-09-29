import { shareImage, ogContentType, ogSize } from "@/lib/og/card";
import { getCategories, getTopicByShortId } from "@/lib/forum/queries";
import { siteConfig } from "@/lib/site";

export const alt = "Topic on The Sellers Network";
export const size = ogSize;
export const contentType = ogContentType;

/*
  Share card for a forum topic: title, forum and reply count. Nothing private:
  a topic in a private forum, or one that is deleted or cannot be read, gets
  the plain site card, and no author name is shown, so anonymous posts stay
  anonymous.
*/
export default async function Image({ params }: { params: Promise<{ slug: string; id: string }> }) {
  const { id } = await params;
  const [data, categories] = await Promise.all([getTopicByShortId(id), getCategories()]);
  const topic = data?.topic;
  const category = topic?.category ? categories.find((c) => c.id === topic.category!.id) : null;
  if (!topic || topic.deleted_at || !category || category.is_private) return shareImage({ title: siteConfig.name, meta: ["Forum"] });

  const replies = topic.reply_count ?? 0;
  return shareImage({
    label: topic.is_solved ? "Solved" : "Forum",
    title: topic.title,
    meta: [category.name, replies === 1 ? "1 reply" : `${replies} replies`],
  });
}
