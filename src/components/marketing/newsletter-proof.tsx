import Link from "next/link";
import { getLatestIssue } from "@/lib/forum/home-queries";
import { longDate } from "@/lib/format";

/*
  Under the newsletter box: the last issue, when it went and to how many
  people, with a link to read it. Renders nothing until an issue has really
  been sent, so the site never claims a newsletter it has not written.
*/
export async function NewsletterProof() {
  const issue = await getLatestIssue();
  if (!issue) return null;
  return (
    <p className="mt-3 text-center text-sm text-muted-foreground">
      Last issue:{" "}
      <Link href={`/newsletter/${issue.slug}`} className="text-brand underline underline-offset-2 hover:text-brand-deep">
        {issue.subject}
      </Link>
      , {longDate(issue.sent_at).split(" at")[0]}
      {issue.recipient_count >= 50 ? `, sent to ${issue.recipient_count.toLocaleString("en-GB")} people` : ""}.{" "}
      <Link href="/newsletter" className="underline underline-offset-2 hover:text-foreground">
        Read past issues
      </Link>
    </p>
  );
}
