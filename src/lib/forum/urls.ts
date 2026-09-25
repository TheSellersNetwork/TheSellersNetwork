/* Every forum URL is built here so a change to the scheme happens once. */

export const urls = {
  community: () => "/community",
  category: (slug: string) => `/community/c/${slug}`,
  topic: (t: { slug: string; short_id: string }, postNumber?: number) =>
    `/community/t/${t.slug}/${t.short_id}${postNumber && postNumber > 1 ? `#post-${postNumber}` : ""}`,
  newTopic: (categorySlug?: string) =>
    `/community/new${categorySlug ? `?category=${encodeURIComponent(categorySlug)}` : ""}`,
  profile: (username: string) => `/community/u/${username}`,
  rules: () => "/community/rules",
  search: (q?: string) => `/community/search${q ? `?q=${encodeURIComponent(q)}` : ""}`,
  notifications: () => "/community/notifications",
  login: (next?: string) => `/login${next ? `?next=${encodeURIComponent(next)}` : ""}`,
  signup: () => "/signup",
  onboarding: () => "/onboarding",
  account: () => "/account",
  adminFlags: () => "/admin/flags",
  blog: () => "/blog",
  blogPost: (slug: string) => `/blog/${slug}`,
  guides: () => "/guides",
  guide: (slug: string) => `/guides/${slug}`,
};
