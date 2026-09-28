"use client";

import { useActionState, useState, useTransition } from "react";
import { Heart } from "lucide-react";
import { toast } from "sonner";
import { deletePickup, markPickupSold, togglePickupLike, type PickupState } from "@/app/pickups/actions";
import { pickupPlatforms } from "@/lib/pickups";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export function NiceFind({ id, liked, count, signedIn, own }: { id: string; liked: boolean; count: number; signedIn: boolean; own: boolean }) {
  const [state, setState] = useState({ liked, count });
  const [pending, start] = useTransition();
  if (own) return count > 0 ? <p className="text-sm text-muted-foreground">{count} {count === 1 ? "member says" : "members say"} nice find</p> : null;
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      disabled={pending}
      aria-pressed={state.liked}
      onClick={() => {
        if (!signedIn) {
          toast("Sign in to say nice find.");
          return;
        }
        start(async () => {
          const r = await togglePickupLike(id);
          if (r.ok && r.liked !== undefined) setState({ liked: r.liked, count: r.count ?? 0 });
          else if (r.message) toast(r.message);
        });
      }}
    >
      <Heart className={cn("size-4", state.liked && "fill-current text-destructive")} /> Nice find{state.count > 0 ? ` · ${state.count}` : ""}
    </Button>
  );
}

export function MarkSold({ id }: { id: string }) {
  const [state, action, pending] = useActionState<PickupState, FormData>(markPickupSold, { ok: false, message: "" });
  if (state.ok) return <p className="text-sm text-success">{state.message}</p>;
  return (
    <form action={action} className="rounded-xl border bg-card p-4">
      <h2 className="font-semibold">Sold it?</h2>
      <p className="text-sm text-muted-foreground">Add the price so the BOLO list learns from it.</p>
      <input type="hidden" name="id" value={id} />
      <div className="mt-3 flex flex-wrap items-end gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="sold_price">Sold for (£)</Label>
          <Input id="sold_price" name="sold_price" inputMode="decimal" required className="w-32" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="sold_platform">On</Label>
          <select id="sold_platform" name="sold_platform" className="h-9 rounded-md border bg-background px-2 text-sm" defaultValue="ebay">
            {Object.entries(pickupPlatforms).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </div>
        <Button type="submit" disabled={pending}>
          {pending ? "Saving" : "Save"}
        </Button>
      </div>
      {state.message ? <p className="mt-2 text-sm text-destructive">{state.message}</p> : null}
    </form>
  );
}

export function DeletePickup({ id }: { id: string }) {
  const [pending, start] = useTransition();
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className="text-destructive"
      disabled={pending}
      onClick={() => {
        if (window.confirm("Delete this pickup?")) start(() => deletePickup(id));
      }}
    >
      Delete
    </Button>
  );
}
