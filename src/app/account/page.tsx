import type { Metadata } from "next";
import { AccountForm } from "@/components/auth/account-form";
import { requireUser } from "@/lib/auth";
import { StyleSwitcher } from "@/components/style-switcher";
import { currentStyle } from "@/lib/style-server";
import { urls } from "@/lib/forum/urls";

export const metadata: Metadata = { title: "Account", robots: { index: false } };

export default async function AccountPage() {
  const user = await requireUser(urls.account());
  const p = user.profile;
  const style = await currentStyle();

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
            flair: p.flair ?? [],
          }}
        />
      </div>
      <section className="mt-12">
        <h2 className="text-lg font-semibold">How the forum looks to you</h2>
        <p className="mt-1 text-sm text-muted-foreground">Your choice only. Dark mode is the moon button in the header.</p>
        <div className="mt-3">
          <StyleSwitcher initialStyle={style} layout="list" />
        </div>
      </section>
      <section className="mt-12 rounded-lg border p-4 text-sm">
        <h2 className="font-semibold">Purchases and bookings</h2>
        <p className="mt-1 text-muted-foreground">Nothing to show yet.</p>
      </section>
      <section className="mt-6 rounded-lg border border-destructive/40 p-4 text-sm">
        <h2 className="font-semibold">Delete your account</h2>
        <p className="mt-1 text-muted-foreground">Deleting your account anonymises your posts and removes your profile. Email us from the address on your account and we will do it within a week.</p>
      </section>
    </main>
  );
}
