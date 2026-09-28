import type { Metadata } from "next";
import Link from "next/link";
import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { longDate } from "@/lib/format";
import { updateMessage } from "./actions";

export const metadata: Metadata = { title: "Messages", robots: { index: false } };

type Message = {
  id: string;
  kind: string;
  name: string | null;
  email: string | null;
  url: string | null;
  message: string;
  status: string;
  staff_note: string | null;
  created_at: string;
};

/* Which kinds have a legal clock, shown first and marked. */
const urgent: Record<string, string> = {
  report: "Illegal content: act promptly",
  defamation: "Defamation notice: pass to the poster within 48 hours",
  copyright: "Copyright notice: act promptly",
  data: "Data request: reply within one month",
  complaint: "Complaint: acknowledge within 30 days",
  appeal: "Appeal: a different staff member reviews",
};

export default async function MessagesPage({ searchParams }: PageProps<"/admin/messages">) {
  await requireStaff();
  const sp = await searchParams;
  const showClosed = sp.show === "closed";
  const supabase = await createClient();
  const query = supabase.from("contact_messages").select("*").order("created_at", { ascending: false }).limit(200);
  const { data } = await (showClosed ? query.eq("status", "closed") : query.neq("status", "closed"));
  const messages = ((data ?? []) as Message[]).sort((a, b) => Number(b.kind in urgent) - Number(a.kind in urgent));

  return (
    <main id="main" className="mx-auto w-full max-w-4xl flex-1 px-4 py-10 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Messages and reports</h1>
          <p className="mt-1 text-sm text-muted-foreground">Everything sent through the contact and report forms. Notes here are the record we keep for 3 years.</p>
        </div>
        <Link href={showClosed ? "/admin/messages" : "/admin/messages?show=closed"} className="text-sm underline">
          {showClosed ? "Show open" : "Show closed"}
        </Link>
      </div>
      {messages.length === 0 ? <p className="mt-10 rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">Nothing here.</p> : null}
      <ul className="mt-6 space-y-4">
        {messages.map((m) => (
          <li key={m.id} className="rounded-lg border bg-card p-4 text-sm">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded bg-secondary px-2 py-0.5 text-xs font-medium uppercase">{m.kind}</span>
              {urgent[m.kind] ? <span className="text-xs font-medium text-destructive">{urgent[m.kind]}</span> : null}
              <span className="ml-auto text-xs text-muted-foreground">
                {m.id.slice(0, 8).toUpperCase()} · {longDate(m.created_at)}
              </span>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              {m.name ?? "No name"} · {m.email ? <a href={`mailto:${m.email}`}>{m.email}</a> : "no email"}
              {m.url ? (
                <>
                  {" · "}
                  <a href={m.url} target="_blank" rel="noopener noreferrer" className="underline">
                    {m.url}
                  </a>
                </>
              ) : null}
            </p>
            <p className="mt-2 whitespace-pre-wrap">{m.message}</p>
            <form action={updateMessage} className="mt-3 flex flex-wrap items-end gap-2">
              <input type="hidden" name="id" value={m.id} />
              <label className="flex-1 text-xs">
                <span className="text-muted-foreground">What was done</span>
                <input name="staff_note" defaultValue={m.staff_note ?? ""} className="mt-1 h-8 w-full rounded-md border bg-background px-2 text-sm" />
              </label>
              <select name="status" defaultValue={m.status} className="h-8 rounded-md border bg-background px-2 text-sm">
                <option value="open">Open</option>
                <option value="in_progress">In progress</option>
                <option value="closed">Closed</option>
              </select>
              <button type="submit" className="h-8 rounded-md border px-3 text-sm hover:bg-secondary">
                Save
              </button>
            </form>
          </li>
        ))}
      </ul>
    </main>
  );
}
