import { permanentRedirect } from "next/navigation";

/* Change breakdowns moved into the blog. */
export default async function OldChangeRedirect({ params }: PageProps<"/changes/[slug]">) {
  const { slug } = await params;
  permanentRedirect(`/blog/${slug.replace(/[^a-z0-9-]/g, "")}`);
}
