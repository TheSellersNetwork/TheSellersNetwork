import Link from "next/link";
import type { Metadata } from "next";
import { AccountForm } from "@/components/auth/account-form";
import { requireUser } from "@/lib/auth";
import { StyleSwitcher } from "@/components/style-switcher";
import { currentStyle } from "@/lib/style-server";
import { urls } from "@/lib/forum/urls";
import { AppCard } from "@/components/app/app-card";
import { DeleteAccount } from "@/components/auth/delete-account";

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
      <AppCard className="mt-12" />
      <section className="mt-12">
        <h2 className="text-lg font-semibold">How the forum looks to you</h2>
        <p className="mt-1 text-sm text-muted-foreground">Your choice only. Dark mode is the moon button in the header.</p>
        <div className="mt-3">
          <StyleSwitcher initialStyle={style} layout="list" />
        </div>
      </section>
      <section className="mt-12 rounded-lg border p-4 text-sm">
        <h2 className="font-semibold">Your data</h2>
        <p className="mt-1 text-muted-foreground">
          Download everything we hold about your account as a file: profile, posts, likes, follows, notifications and more. For anything else, see the{" "}
          <Link href="/privacy" className="underline">
            privacy policy
          </Link>
          .
        </p>
        {/* A plain link: this downloads a file from a route handler, so client-side navigation would be wrong. */}
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
        <a href="/account/export" className="mt-3 inline-block rounded-md border px-3 py-1.5 font-medium hover:bg-secondary">
          Download my data
        </a>
      </section>
      <DeleteAccount username={p.username} />
    </main>
  );
}
