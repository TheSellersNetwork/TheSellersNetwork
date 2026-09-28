"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { Turnstile } from "@marsidev/react-turnstile";
import { sendContact, type ContactState } from "@/app/contact/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const kinds: { id: string; label: string; help: string; needsUrl?: boolean }[] = [
  { id: "general", label: "A question or feedback", help: "Anything about the site. For help with selling, the forums will get you a faster answer." },
  {
    id: "report",
    label: "Report illegal or harmful content",
    help: "Give the link to the post or profile and tell us what is wrong. You do not need an account. If someone is in immediate danger, call 999 first.",
    needsUrl: true,
  },
  { id: "data", label: "My data (access, correction, deletion)", help: "Say what you would like us to do. You can also download or delete your data yourself from your account page. We reply within one month." },
  { id: "complaint", label: "A complaint", help: "Tell us what happened and what you would like us to do. We acknowledge complaints within 30 days." },
  { id: "appeal", label: "Appeal a moderation decision", help: "Tell us which post or decision, and why you think it was wrong. Someone who did not make the original decision will review it. This works even if your account is suspended." },
  {
    id: "defamation",
    label: "A post is defamatory about me",
    help: "So we can act under the Defamation (Operators of Websites) Regulations 2013, include: your full name, the exact words you complain about, what you think they mean, which parts are untrue or are opinion not supported by fact, and whether you agree to your name being passed to the person who posted them.",
    needsUrl: true,
  },
  {
    id: "copyright",
    label: "A post uses my copyright work",
    help: "Say what the work is, that you own it or act for the owner, and where it appears on our site. We remove infringing material promptly.",
    needsUrl: true,
  },
  { id: "accessibility", label: "Accessibility or a reasonable adjustment", help: "Tell us what is hard to use or what would help, for example information in another format." },
  { id: "partnership", label: "Partnerships and advertising", help: "Sponsors are always labelled as adverts. Tell us about your business." },
];

const reportReasons = ["Illegal content", "Child safety", "Scam or fraud", "Harassment or threats", "Hate", "Terrorism", "Self-harm", "Personal information shared without consent", "Something else"];

export function ContactForm({ initialKind = "general", signedIn, turnstileSiteKey }: { initialKind?: string; signedIn: boolean; turnstileSiteKey?: string }) {
  const [kind, setKind] = useState(initialKind);
  const [token, setToken] = useState("");
  const [state, action, pending] = useActionState<ContactState, FormData>(sendContact, { ok: false, message: "" });
  const current = kinds.find((k) => k.id === kind) ?? kinds[0];

  if (state.ok) {
    return (
      <div className="rounded-xl border bg-card p-6" role="status">
        <p className="font-semibold">{state.message}</p>
        <p className="mt-1 text-sm text-muted-foreground">Your reference is {state.reference}. We have emailed you a copy.</p>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-5">
      <div className="space-y-1.5">
        <Label htmlFor="kind">What is it about?</Label>
        <select id="kind" name="kind" value={kind} onChange={(e) => setKind(e.target.value)} className="h-9 w-full rounded-md border bg-background px-2 text-sm sm:w-96">
          {kinds.map((k) => (
            <option key={k.id} value={k.id}>
              {k.label}
            </option>
          ))}
        </select>
        <p className="text-sm text-muted-foreground">{current.help}</p>
      </div>

      {kind === "report" ? (
        <div className="space-y-1.5">
          <Label htmlFor="reason">Reason</Label>
          <select id="reason" name="reason" className="h-9 w-full rounded-md border bg-background px-2 text-sm sm:w-96" defaultValue={reportReasons[0]}>
            {reportReasons.map((r) => (
              <option key={r}>{r}</option>
            ))}
          </select>
        </div>
      ) : null}

      <div className="space-y-1.5">
        <Label htmlFor="url">Link to the post or page{current.needsUrl ? "" : " (optional)"}</Label>
        <Input id="url" name="url" type="url" required={current.needsUrl} placeholder="https://..." />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="name">Your name (optional)</Label>
          <Input id="name" name="name" autoComplete="name" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="email">Your email{signedIn ? " (optional, we use your account email)" : ""}</Label>
          <Input id="email" name="email" type="email" autoComplete="email" required={!signedIn} />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="message">Message</Label>
        <Textarea id="message" name="message" required minLength={10} maxLength={5000} rows={7} />
      </div>

      {!signedIn && turnstileSiteKey ? <Turnstile siteKey={turnstileSiteKey} onSuccess={setToken} onExpire={() => setToken("")} options={{ theme: "auto" }} /> : null}
      <input type="hidden" name="turnstile_token" value={token} />

      {state.message ? (
        <p className="text-sm text-destructive" role="alert">
          {state.message}
        </p>
      ) : null}
      <Button type="submit" disabled={pending || (!signedIn && !!turnstileSiteKey && !token)}>
        {pending ? "Sending" : "Send"}
      </Button>
      <p className="text-xs text-muted-foreground">
        We use what you send only to deal with it, and keep it for up to 3 years as our record. See the{" "}
        <Link href="/privacy" className="underline">
          privacy policy
        </Link>
        .
      </p>
    </form>
  );
}
