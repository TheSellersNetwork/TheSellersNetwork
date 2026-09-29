"use client";

import { useActionState, useEffect, useId, useRef, useState, useTransition } from "react";
import { Flag } from "lucide-react";
import { toast } from "sonner";
import { deleteMilestone, saveMilestone, type MilestoneState } from "@/app/community/u/milestone-actions";
import { MILESTONE_LABEL_MAX, MILESTONE_MAX, milestoneDate, milestoneSuggestions, ukToday, type Milestone } from "@/app/community/u/milestone-rules";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/*
  Milestones a member has chosen to share, as a small timeline. They are
  self-declared, so the heading says whose they are rather than presenting
  them as facts the site has checked. The owner can add, edit and delete.
*/
export function Milestones({ items, name, own }: { items: Milestone[]; name: string; own: boolean }) {
  const [editing, setEditing] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  if (!own && items.length === 0) return null;

  return (
    <section aria-labelledby="milestones-heading" className="mt-8">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="milestones-heading" className="text-lg font-semibold">
          Milestones shared by {name}
        </h2>
        <p className="text-sm text-muted-foreground">Self-declared by the member</p>
      </div>

      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">Share a moment like your first sale or a year of reselling. Up to {MILESTONE_MAX}, and you can edit or delete them any time.</p>
      ) : (
        <ol className="relative ml-2 space-y-4 border-l pl-5">
          {items.map((m) => (
            <li key={m.id} className="relative">
              <span className="absolute -left-[27px] top-1 grid size-3.5 place-items-center rounded-full border-2 border-brand bg-background" aria-hidden="true" />
              {editing === m.id ? (
                <MilestoneForm milestone={m} onDone={() => setEditing(null)} />
              ) : (
                <>
                  <p className="font-medium">{m.label}</p>
                  <p className="text-sm text-muted-foreground">
                    <time dateTime={m.happened_on}>{milestoneDate(m.happened_on)}</time>
                  </p>
                  {own ? <OwnerControls id={m.id} label={m.label} onEdit={() => setEditing(m.id)} /> : null}
                </>
              )}
            </li>
          ))}
        </ol>
      )}

      {own ? (
        <div className="mt-4">
          {adding ? (
            <MilestoneForm onDone={() => setAdding(false)} />
          ) : items.length < MILESTONE_MAX ? (
            <Button type="button" variant="outline" size="sm" onClick={() => setAdding(true)}>
              <Flag className="size-4" aria-hidden="true" /> Add a milestone
            </Button>
          ) : (
            <p className="text-sm text-muted-foreground">You have shared {MILESTONE_MAX} milestones, the most there is room for. Delete one to add another.</p>
          )}
        </div>
      ) : null}
    </section>
  );
}

function OwnerControls({ id, label, onEdit }: { id: string; label: string; onEdit: () => void }) {
  const [pending, start] = useTransition();
  const btn = "inline-flex min-h-6 items-center underline hover:text-foreground disabled:opacity-60 pointer-coarse:min-h-11";
  return (
    <p className="mt-1 flex gap-3 text-xs text-muted-foreground">
      <button type="button" className={btn} onClick={onEdit} aria-label={`Edit milestone: ${label}`}>
        Edit
      </button>
      <button
        type="button"
        className={`${btn} hover:text-destructive`}
        disabled={pending}
        aria-label={`Delete milestone: ${label}`}
        onClick={() => {
          if (!window.confirm("Delete this milestone?")) return;
          start(async () => {
            const r = await deleteMilestone(id);
            if (!r.ok) toast(r.message ?? "That did not work.");
          });
        }}
      >
        {pending ? "Deleting" : "Delete"}
      </button>
    </p>
  );
}

function MilestoneForm({ milestone, onDone }: { milestone?: Milestone; onDone: () => void }) {
  const [state, action, pending] = useActionState<MilestoneState, FormData>(saveMilestone, { ok: false, message: "" });
  const uid = useId();
  const handled = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (state.ok && handled.current !== state.nonce) {
      handled.current = state.nonce;
      toast(state.message);
      onDone();
    }
  }, [state.ok, state.nonce, state.message, onDone]);

  return (
    <form action={action} className="space-y-3 rounded-lg border bg-card p-3">
      {milestone ? <input type="hidden" name="id" value={milestone.id} /> : null}
      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_11rem]">
        <div className="space-y-1.5">
          <Label htmlFor={`${uid}-label`}>Milestone</Label>
          <Input id={`${uid}-label`} name="label" required minLength={2} maxLength={MILESTONE_LABEL_MAX} defaultValue={milestone?.label} list={`${uid}-ideas`} placeholder="For example, 100th sale" />
          <datalist id={`${uid}-ideas`}>
            {milestoneSuggestions.map((s) => (
              <option key={s} value={s} />
            ))}
          </datalist>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`${uid}-date`}>When</Label>
          <Input id={`${uid}-date`} name="happened_on" type="date" required min="1990-01-01" max={ukToday()} defaultValue={milestone?.happened_on} />
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Saving" : milestone ? "Save" : "Add"}
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={onDone}>
          Cancel
        </Button>
        {state.message && !state.ok ? (
          <p role="alert" className="text-sm text-destructive">
            {state.message}
          </p>
        ) : null}
      </div>
    </form>
  );
}
