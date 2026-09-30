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
    help: "For a post on this site that you say is untrue and harms your reputation. The questions below are what the Defamation Act 2013 and its regulations ask for, so we can deal with it properly.",
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

export function ContactForm({ initialKind = "general", initialUrl, signedIn, turnstileSiteKey }: { initialKind?: string; initialUrl?: string; signedIn: boolean; turnstileSiteKey?: string }) {
  const [kind, setKind] = useState(initialKind);
  const [token, setToken] = useState("");
  const [state, action, pending] = useActionState<ContactState, FormData>(sendContact, { ok: false, message: "" });
  const current = kinds.find((k) => k.id === kind) ?? kinds[0];

  if (state.ok) {
    return (
      <div className="rounded-xl border bg-card p-6" role="status">
        <p className="font-semibold">{state.message}</p>
        <p className="mt-1 text-sm text-muted-foreground">Your reference is {state.reference}. We have emailed you a copy.</p>
        {kind === "defamation" ? (
          <p className="mt-2 text-sm text-muted-foreground">
            Within two working days we will send your complaint to the person who posted it, or remove the post if we have no way to contact them, and let you know. We will tell you what happens after that.
          </p>
        ) : null}
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

      {kind === "defamation" ? (
        <DefamationFields initialUrl={initialUrl} />
      ) : (
        <>
          <div className="space-y-1.5">
            <Label htmlFor="url">Link to the post or page{current.needsUrl ? "" : " (optional)"}</Label>
            <Input id="url" name="url" type="url" required={current.needsUrl} placeholder="https://..." defaultValue={initialUrl} />
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
        </>
      )}

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

/*
  Everything a notice of complaint must contain under the Defamation Act 2013
  s5(6) and the Defamation (Operators of Websites) Regulations 2013 reg 2.
  The server checks the same things.
*/
function DefamationFields({ initialUrl }: { initialUrl?: string }) {
  const [previous, setPrevious] = useState("no");
  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="name">Your full name</Label>
          <Input id="name" name="name" autoComplete="name" required maxLength={200} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="email">Email address we can contact you at</Label>
          <Input id="email" name="email" type="email" autoComplete="email" required maxLength={254} />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="url">Link to the post where the statement appears</Label>
        <Input id="url" name="url" type="url" required placeholder="https://..." defaultValue={initialUrl} maxLength={500} aria-describedby="url-help" />
        <p id="url-help" className="text-sm text-muted-foreground">
          Use the Share button on the post to copy its link. If the same words appear in more than one post, send a separate form for each.
        </p>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="statement">The exact words you are complaining about</Label>
        <Textarea id="statement" name="statement" required minLength={3} maxLength={5000} rows={4} />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="meaning">What you take those words to mean, and why they are defamatory of you</Label>
        <Textarea id="meaning" name="meaning" required minLength={10} maxLength={5000} rows={4} aria-describedby="meaning-help" />
        <p id="meaning-help" className="text-sm text-muted-foreground">
          For example, what a reader would understand them to say about you, and how that harms your reputation.
        </p>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="inaccuracies">Which parts are factually inaccurate, or are opinions not supported by fact</Label>
        <Textarea id="inaccuracies" name="inaccuracies" required minLength={3} maxLength={5000} rows={4} />
      </div>

      <label className="flex items-start gap-2 text-sm">
        <input type="checkbox" name="insufficient_info" value="yes" className="mt-1 accent-brand" />
        <span>I confirm that I do not have enough information about the person who posted the statement to bring legal proceedings against them.</span>
      </label>

      <YesNo name="consent_name" legend="May we give your name to the person who posted it?" />
      <YesNo name="consent_email" legend="May we give your email address to the person who posted it?" />
      <p className="-mt-2 text-sm text-muted-foreground">If you say no, we send them your complaint with your name or email address removed.</p>

      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">Have we removed this statement, or one substantially the same, after your complaints on two or more earlier occasions?</legend>
        <div className="flex gap-4 text-sm">
          {["no", "yes"].map((v) => (
            <label key={v} className="flex items-center gap-2">
              <input type="radio" name="previous_removals" value={v} checked={previous === v} onChange={() => setPrevious(v)} className="accent-brand" />
              {v === "yes" ? "Yes" : "No"}
            </label>
          ))}
        </div>
      </fieldset>
      {previous === "yes" ? (
        <div className="space-y-1.5">
          <Label htmlFor="previous_details">Your earlier references or dates, if you have them</Label>
          <Textarea id="previous_details" name="previous_details" maxLength={2000} rows={2} />
        </div>
      ) : null}

      <div className="rounded-lg border bg-muted/40 p-4 text-sm text-muted-foreground">
        <p className="font-medium text-foreground">What happens next</p>
        <p className="mt-1">
          Within two working days we will send your complaint to the person who posted the statement, or remove it if we have no way to contact them. They have until midnight at the end of the fifth day after that
          to reply. If they do not reply in time, agree to removal, or object without giving their full name and postal address, we remove it. If they object and give those details, we tell you, and pass their
          details on only if they agree or a court orders us to.
        </p>
        <p className="mt-2">If you did not tick the confirmation above, we will still look at the post under our house rules, but this legal process does not apply.</p>
        <p className="mt-2">[TOM: any extra wording on what we do alongside this process, reviewed by a solicitor]</p>
      </div>
    </div>
  );
}

function YesNo({ name, legend }: { name: string; legend: string }) {
  return (
    <fieldset className="space-y-2">
      <legend className="text-sm font-medium">{legend}</legend>
      <div className="flex gap-4 text-sm">
        <label className="flex items-center gap-2">
          <input type="radio" name={name} value="yes" required className="accent-brand" />
          Yes
        </label>
        <label className="flex items-center gap-2">
          <input type="radio" name={name} value="no" required className="accent-brand" />
          No
        </label>
      </div>
    </fieldset>
  );
}
