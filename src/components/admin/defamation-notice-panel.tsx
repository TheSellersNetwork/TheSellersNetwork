import { updateDefamationNotice } from "@/app/admin/messages/actions";
import { CopyText } from "@/components/admin/copy-text";
import { instantToLondonLocal } from "@/lib/defamation/deadlines";
import {
  defamationTimeline,
  formatLondon,
  noticeProblems,
  posterNotificationText,
  posterResponseLabels,
  posterResponses,
  routeLabel,
  type DefamationNotice,
  type Step,
} from "@/lib/defamation/notice";
import { siteConfig } from "@/lib/site";
import { cn } from "@/lib/utils";

export type StoredNotice = DefamationNotice & { id: string; message_id: string; previous_details: string | null };

const stateLabels: Record<Step["state"], string> = { done: "Done", due: "Due", overdue: "Overdue", waiting: "Not yet" };

function localValue(iso: string | null): string {
  return iso ? instantToLondonLocal(new Date(iso)) : "";
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 whitespace-pre-wrap break-words">{children}</dd>
    </div>
  );
}

function TimeInput({ name, label, value }: { name: string; label: string; value: string | null }) {
  return (
    <label className="text-xs">
      <span className="text-muted-foreground">{label}</span>
      <input type="datetime-local" name={name} defaultValue={localValue(value)} className="mt-1 h-8 w-full rounded-md border bg-background px-2 text-sm" />
    </label>
  );
}

/*
  The staff view of a defamation notice: what the complainant sent, whether
  it is a valid notice, every deadline the regulations set and what has been
  recorded against it. Times are UK time.
*/
export function DefamationNoticePanel({ notice }: { notice: StoredNotice }) {
  const now = new Date();
  const problems = noticeProblems(notice);
  const timeline = defamationTimeline(notice, now);
  const template = timeline.route === "standard" ? posterNotificationText(notice, siteConfig.name, notice.poster_notified_at ? new Date(notice.poster_notified_at) : now) : null;

  return (
    <div className="mt-3 space-y-4 rounded-md border bg-background p-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className={cn("rounded px-2 py-0.5 text-xs font-medium", problems.length ? "bg-destructive/10 text-destructive" : "bg-success/10 text-success")}>
          {problems.length ? "Not a valid notice" : "Valid notice of complaint"}
        </span>
        <span className="text-xs font-medium">{routeLabel(timeline.route)}</span>
        <span className="text-xs text-muted-foreground">Received {formatLondon(new Date(notice.received_at))}</span>
      </div>
      {problems.length ? <p className="text-xs text-destructive">Missing: {problems.join("; ")}.</p> : null}

      <dl className="grid gap-3 text-sm sm:grid-cols-2">
        <Field label="Complainant">{notice.complainant_name}</Field>
        <Field label="Email">
          <a href={`mailto:${notice.complainant_email}`} className="underline">
            {notice.complainant_email}
          </a>
        </Field>
        <div className="sm:col-span-2">
          <Field label="Where it was posted">
            {/^https?:\/\//i.test(notice.statement_url) ? (
              <a href={notice.statement_url} target="_blank" rel="noopener noreferrer nofollow" className="break-all underline">
                {notice.statement_url}
              </a>
            ) : (
              notice.statement_url
            )}
          </Field>
        </div>
        <div className="sm:col-span-2">
          <Field label="Statement complained of">{notice.statement}</Field>
        </div>
        <div className="sm:col-span-2">
          <Field label="Meaning and why it is defamatory">{notice.meaning}</Field>
        </div>
        <div className="sm:col-span-2">
          <Field label="Factually inaccurate, or opinion not supported by fact">{notice.inaccuracies}</Field>
        </div>
        <Field label="Confirms they cannot identify the poster">{notice.insufficient_info_confirmed ? "Yes" : "No"}</Field>
        <Field label="May we share with the poster">
          Name: {notice.consent_share_name ? "yes" : "no"}. Email: {notice.consent_share_email ? "yes" : "no"}.
        </Field>
        <Field label="Removed after two or more earlier complaints">{notice.previous_removals ? `Yes${notice.previous_details ? `: ${notice.previous_details}` : ""}` : "No"}</Field>
      </dl>

      <section aria-label="Deadlines">
        <h3 className="text-sm font-semibold">Deadlines (UK time)</h3>
        <p className="mt-1 text-xs text-muted-foreground">{timeline.summary}</p>
        <p className="mt-1 text-xs text-muted-foreground">
          &ldquo;48 hours&rdquo; leaves out weekends, Good Friday, Christmas Day and bank holidays in England and Wales (reg 1(3)).
        </p>
        {timeline.posterDeadline ? (
          <p className="mt-2 text-sm">
            Poster must reply by <strong>{formatLondon(timeline.posterDeadline)}</strong>
          </p>
        ) : null}
        <ul className="mt-2 space-y-1.5">
          {timeline.steps.map((s) => (
            <li key={s.id} className="flex flex-wrap items-baseline gap-x-2 text-sm">
              <span
                className={cn(
                  "w-16 shrink-0 text-xs font-medium",
                  s.state === "done" && "text-success",
                  s.state === "overdue" && "text-destructive",
                  (s.state === "due" || s.state === "waiting") && "text-muted-foreground",
                )}
              >
                {stateLabels[s.state]}
              </span>
              <span className="font-medium">{s.label}</span>
              <span className="text-xs text-muted-foreground">
                {s.doneAt ? `done ${formatLondon(s.doneAt)}` : s.due ? `by ${formatLondon(s.due)}` : null} ({s.rule})
              </span>
              {s.note ? <span className="basis-full pl-[4.5rem] text-xs text-muted-foreground">{s.note}</span> : null}
            </li>
          ))}
        </ul>
      </section>

      <form action={updateDefamationNotice} className="space-y-3 border-t pt-3">
        <input type="hidden" name="id" value={notice.id} />
        <input type="hidden" name="message_id" value={notice.message_id} />
        <h3 className="text-sm font-semibold">Record what was done</h3>
        <p className="text-xs text-muted-foreground">Enter UK times. Nothing here emails anyone: send each message yourself, then record it.</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-xs">
            <span className="text-muted-foreground">Can we contact the poster privately?</span>
            <select
              name="poster_contactable"
              defaultValue={notice.poster_contactable === null ? "" : notice.poster_contactable ? "yes" : "no"}
              className="mt-1 h-8 w-full rounded-md border bg-background px-2 text-sm"
            >
              <option value="">Not checked yet</option>
              <option value="yes">Yes (account email or private message)</option>
              <option value="no">No (for example, a deleted account)</option>
            </select>
          </label>
          <TimeInput name="poster_notified_at" label="Poster notified at" value={notice.poster_notified_at} />
          <TimeInput
            name="complainant_acknowledged_at"
            label={problems.length ? "Complainant told what is missing at" : "Complainant acknowledged at"}
            value={notice.complainant_acknowledged_at}
          />
          <label className="text-xs">
            <span className="text-muted-foreground">Poster&rsquo;s response</span>
            <select name="poster_response" defaultValue={notice.poster_response ?? ""} className="mt-1 h-8 w-full rounded-md border bg-background px-2 text-sm">
              <option value="">Waiting</option>
              {posterResponses.map((r) => (
                <option key={r} value={r}>
                  {posterResponseLabels[r]}
                </option>
              ))}
            </select>
          </label>
          <TimeInput name="poster_response_at" label="Response received at" value={notice.poster_response_at} />
          <label className="text-xs">
            <span className="text-muted-foreground">Action taken</span>
            <select name="outcome" defaultValue={notice.outcome ?? ""} className="mt-1 h-8 w-full rounded-md border bg-background px-2 text-sm">
              <option value="">None yet</option>
              <option value="removed">Statement removed</option>
              <option value="kept">Statement kept up</option>
            </select>
          </label>
          <TimeInput name="outcome_at" label="Action taken at" value={notice.outcome_at} />
          <TimeInput name="complainant_informed_at" label="Complainant told the outcome at" value={notice.complainant_informed_at} />
        </div>
        <p className="text-xs text-muted-foreground">A response or action saved without a time is recorded as now.</p>
        <button type="submit" className="h-8 rounded-md border px-3 text-sm hover:bg-secondary">
          Save notice record
        </button>
      </form>

      {template ? (
        <div className="space-y-1.5 border-t pt-3">
          <CopyText id={`poster-template-${notice.id}`} label="Notification to the poster (Schedule para 2)" text={template} />
          <p className="text-xs text-muted-foreground">
            {notice.poster_notified_at ? "The deadline in this text is worked out from the time you recorded." : "The deadline in this text assumes you send it today; if you send it later, reload this page first."} The
            complainant&rsquo;s name and email are left out unless they agreed. If they did not agree, also check the statement and meaning for anything that identifies them before you send it.
          </p>
        </div>
      ) : null}
    </div>
  );
}
