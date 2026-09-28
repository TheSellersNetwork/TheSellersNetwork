"use client";

import { useActionState, useState } from "react";
import { deleteAccount, type DeleteState } from "@/app/account/delete-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function DeleteAccount({ username }: { username: string }) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState<DeleteState, FormData>(deleteAccount, { ok: false, message: "" });

  return (
    <section className="mt-6 rounded-lg border border-destructive/40 p-4 text-sm">
      <h2 className="font-semibold">Delete your account</h2>
      <p className="mt-1 text-muted-foreground">
        This removes your profile, sign-in, likes, bookmarks, follows, notifications and setups straight away. It cannot be undone. Download your data first if you want a copy.
      </p>
      {!open ? (
        <Button type="button" variant="outline" size="sm" className="mt-3 border-destructive/60 text-destructive" onClick={() => setOpen(true)}>
          Delete my account
        </Button>
      ) : (
        <form action={action} className="mt-3 space-y-3">
          <label className="flex items-start gap-2">
            <input type="checkbox" name="remove_posts" className="mt-1 size-4" />
            <span>
              Delete my posts too. If you leave this unticked, your posts stay so threads still make sense, but show as &ldquo;Deleted member&rdquo; with nothing linking them to you.
            </span>
          </label>
          <div className="space-y-1.5">
            <Label htmlFor="confirm">
              Type your username, <strong>{username}</strong>, to confirm
            </Label>
            <Input id="confirm" name="confirm" autoComplete="off" className="w-64" />
          </div>
          {state.message ? (
            <p className="text-destructive" role="alert">
              {state.message}
            </p>
          ) : null}
          <div className="flex gap-2">
            <Button type="submit" variant="destructive" disabled={pending}>
              {pending ? "Deleting" : "Delete my account for good"}
            </Button>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
          </div>
        </form>
      )}
    </section>
  );
}
