"use client";

import { useActionState } from "react";
import { toast } from "sonner";
import { setAskTomWindow, type AdminState } from "@/app/admin/actions";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

/*
  Opens or closes the monthly Ask the team window. When closed, members can read and
  reply but cannot start new questions; the note explains when it reopens.
*/
export function AskTheTeamControls({ categoryId, accepting, note }: { categoryId: string; accepting: boolean; note: string }) {
  const [state, action, pending] = useActionState<AdminState, FormData>(
    async (prev, fd) => {
      const r = await setAskTomWindow(prev, fd);
      if (r.ok) toast(r.message);
      return r;
    },
    { ok: false, message: "" },
  );

  return (
    <form action={action} className="mt-3 space-y-3 rounded-lg border bg-card p-4">
      <input type="hidden" name="category_id" value={categoryId} />
      <p className="text-sm">
        The window is currently <strong>{accepting ? "open" : "closed"}</strong>.
      </p>
      <div className="space-y-1.5">
        <Label htmlFor="note">Note shown on the category</Label>
        <Textarea id="note" name="note" defaultValue={note} rows={2} maxLength={300} placeholder="For example: The next window opens on the first Monday of the month" />
      </div>
      {state.message && !state.ok ? (
        <p className="text-sm text-destructive" role="alert">
          {state.message}
        </p>
      ) : null}
      <div className="flex gap-2">
        <Button type="submit" name="accepting" value={accepting ? "off" : "on"} disabled={pending}>
          {accepting ? "Close the window" : "Open the window"}
        </Button>
        <Button type="submit" name="accepting" value={accepting ? "on" : "off"} variant="outline" disabled={pending}>
          Save note only
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        Questions staff answer are tagged automatically. Run <code>npm run ask-the-team:digest</code> to draft the blog post for the month.
      </p>
    </form>
  );
}
