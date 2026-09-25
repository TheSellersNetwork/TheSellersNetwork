import type { Metadata } from "next";
import { AccountForm } from "@/components/auth/account-form";
import { requireUser } from "@/lib/auth";
import { urls } from "@/lib/forum/urls";

export const metadata: Metadata = { title: "Account", robots: { index: false } };

export default async function AccountPage() {
  const user = await requireUser(urls.account());
  const p = user.profile;

  return (
    <main id="main" className="mx-auto w-full max-w-2xl flex-1 px-4 py-10 sm:px-6">
      <h1 className="text-2xl font-semibold tracking-tight">Account</h1>
      <p className="mt-1 text-sm text-muted-foreground">{user.email}</p>
      <div className="mt-8">
        <AccountForm
          initial={{
            username: p.username,
            display_name: p.display_name ?? "",
            bio: p.bio ?? "",
            marketplaces: p.marketplaces,
            email_on_reply: p.email_on_reply,
            email_on_mention: p.email_on_mention,
            email_digest: p.email_digest,
          }}
        />
      </div>
      <section className="mt-12 rounded-lg border p-4 text-sm">
        <h2 className="font-semibold">Purchases and bookings</h2>
        <p className="mt-1 text-muted-foreground">[TOM: shown once the course and mentoring are live]</p>
      </section>
      <section className="mt-6 rounded-lg border border-destructive/40 p-4 text-sm">
        <h2 className="font-semibold">Delete your account</h2>
        <p className="mt-1 text-muted-foreground">Deleting your account anonymises your posts and removes your profile. [TOM: link to the deletion request process until self-service lands]</p>
      </section>
    </main>
  );
}
