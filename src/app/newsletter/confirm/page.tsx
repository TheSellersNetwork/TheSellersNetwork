import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { confirmNewsletter } from "./actions";

export const metadata: Metadata = { title: "Newsletter", robots: { index: false } };
export const dynamic = "force-dynamic";

/*
  The link in the confirmation email lands here. Opening it changes nothing;
  the subscriber presses the button to confirm (see actions.ts for why).
*/
export default async function ConfirmPage({ searchParams }: PageProps<"/newsletter/confirm">) {
  const sp = await searchParams;
  const token = typeof sp.token === "string" && /^[A-Za-z0-9_-]{20,64}$/.test(sp.token) ? sp.token : null;
  const done = sp.done === "1" ? true : sp.done === "0" ? false : null;

  return (
    <main id="main" className="mx-auto w-full max-w-xl flex-1 px-4 py-16 text-center sm:px-6">
      {done === true ? (
        <>
          <h1 className="text-2xl font-semibold tracking-tight">You are on the list</h1>
          <p className="mt-3 text-muted-foreground">Thanks for confirming. Every email has an unsubscribe link at the bottom.</p>
          <Link href="/community" className="mt-6 inline-block underline">
            Go to the forums
          </Link>
        </>
      ) : token ? (
        <>
          <h1 className="text-2xl font-semibold tracking-tight">Confirm your sign-up</h1>
          <p className="mt-3 text-muted-foreground">One click and you will get the free newsletter: seller news, fee and policy changes and the best of the forum.</p>
          <form action={confirmNewsletter} className="mt-6">
            <input type="hidden" name="token" value={token} />
            <Button type="submit">Yes, sign me up</Button>
          </form>
        </>
      ) : (
        <>
          <h1 className="text-2xl font-semibold tracking-tight">That link has expired</h1>
          <p className="mt-3 text-muted-foreground">It may have been used already, or be more than 30 days old. Sign up again and we will send a fresh one.</p>
          <Link href="/newsletter" className="mt-6 inline-block underline">
            Back to the newsletter page
          </Link>
        </>
      )}
    </main>
  );
}
