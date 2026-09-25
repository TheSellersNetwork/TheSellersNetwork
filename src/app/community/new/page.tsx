import type { Metadata } from "next";
import { ForumShell } from "@/components/layout/forum-shell";
import { NewTopicForm } from "@/components/forum/new-topic-form";
import { requireOnboardedUser } from "@/lib/auth";
import { getCategories } from "@/lib/forum/queries";
import { urls } from "@/lib/forum/urls";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export const metadata: Metadata = { title: "New topic", robots: { index: false } };

export default async function NewTopicPage({ searchParams }: PageProps<"/community/new">) {
  const sp = await searchParams;
  const user = await requireOnboardedUser(urls.newTopic(typeof sp.category === "string" ? sp.category : undefined));
  const categories = await getCategories();
  const preselected = typeof sp.category === "string" ? sp.category : null;

  return (
    <ForumShell hideSidebar source={urls.newTopic()}>
      <h1 className="text-2xl font-semibold tracking-tight">New topic</h1>
      <p className="mt-1 text-sm text-muted-foreground">Say what you tried, what happened, and include the numbers. The more specific the question, the better the answer.</p>
      {!user.emailConfirmed ? (
        <Alert className="mt-4">
          <AlertTitle>Confirm your email first</AlertTitle>
          <AlertDescription>You can write a draft now. Posting opens once you click the link in your welcome email.</AlertDescription>
        </Alert>
      ) : null}
      <div className="mt-6">
        <NewTopicForm
          categories={categories.map((c) => ({ id: c.id, slug: c.slug, name: c.name, parent_id: c.parent_id, min_trust_to_post: c.min_trust_to_post }))}
          preselectedSlug={preselected}
          trustLevel={user.profile.trust_level}
        />
      </div>
    </ForumShell>
  );
}
