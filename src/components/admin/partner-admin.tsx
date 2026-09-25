"use client";

import { useActionState, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { deletePlacement, savePartner, savePlacement, type AdminState } from "@/app/admin/partners/actions";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { PartnerAdminRow } from "@/lib/partners/queries";
import type { Placement } from "@/lib/db/types";

const categories = ["postage", "bookkeeping", "sourcing", "software", "other"] as const;
const relationships = ["partner", "sponsored", "affiliate"] as const;

function toLocalInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function PartnerAdmin({ partners }: { partners: PartnerAdminRow[] }) {
  const [editing, setEditing] = useState<PartnerAdminRow | "new" | null>(null);
  const [placing, setPlacing] = useState<{ partner: PartnerAdminRow; placement: Placement | null } | null>(null);
  const router = useRouter();
  const [pending, start] = useTransition();

  function removePlacement(id: string) {
    if (!window.confirm("Remove this placement?")) return;
    start(async () => {
      const r = await deletePlacement(id);
      if (r.ok) router.refresh();
      else toast.error(r.message);
    });
  }

  return (
    <div className="space-y-6">
      <Button onClick={() => setEditing("new")}>Add partner</Button>
      {partners.length === 0 ? (
        <p className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">No partners yet.</p>
      ) : (
        <ul className="space-y-4">
          {partners.map((p) => (
            <li key={p.id} className="rounded-lg border bg-card p-4 text-sm">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold">{p.name}</span>
                <span className="text-muted-foreground">/{p.slug}</span>
                <span className="rounded bg-secondary px-1.5 py-0.5 text-xs">{p.category}</span>
                <span className="rounded bg-secondary px-1.5 py-0.5 text-xs">{p.relationship}</span>
                {!p.is_active ? <span className="text-xs text-destructive">inactive</span> : null}
                <span className="flex-1" />
                <Button size="sm" variant="outline" onClick={() => setEditing(p)}>
                  Edit
                </Button>
                <Button size="sm" variant="outline" onClick={() => setPlacing({ partner: p, placement: null })}>
                  Add placement
                </Button>
              </div>
              {p.placements.length > 0 ? (
                <table className="mt-3 w-full text-xs">
                  <thead className="text-left text-muted-foreground">
                    <tr>
                      <th className="py-1 font-medium">Slot</th>
                      <th className="py-1 font-medium">Headline</th>
                      <th className="py-1 font-medium">Runs</th>
                      <th className="py-1 text-right font-medium">Impr.</th>
                      <th className="py-1 text-right font-medium">Clicks</th>
                      <th className="py-1 text-right font-medium">CTR</th>
                      <th className="py-1" />
                    </tr>
                  </thead>
                  <tbody>
                    {p.placements.map((pl) => {
                      const live = pl.is_active && new Date(pl.starts_at) <= new Date() && (!pl.ends_at || new Date(pl.ends_at) > new Date());
                      return (
                        <tr key={pl.id} className="border-t">
                          <td className="py-1.5">{pl.slot === "rail" ? "Rail" : "Topic list"}</td>
                          <td className="py-1.5">
                            {pl.headline} {live ? <span className="text-success">live</span> : <span className="text-muted-foreground">off</span>}
                          </td>
                          <td className="py-1.5 text-muted-foreground">
                            {new Date(pl.starts_at).toLocaleDateString("en-GB")} to {pl.ends_at ? new Date(pl.ends_at).toLocaleDateString("en-GB") : "open"}
                          </td>
                          <td className="py-1.5 text-right tabular-nums">{pl.impressions}</td>
                          <td className="py-1.5 text-right tabular-nums">{pl.clicks}</td>
                          <td className="py-1.5 text-right tabular-nums">{pl.impressions ? `${((pl.clicks / pl.impressions) * 100).toFixed(1)}%` : "0%"}</td>
                          <td className="py-1.5 text-right">
                            <button type="button" className="text-brand underline underline-offset-2" onClick={() => setPlacing({ partner: p, placement: pl })}>
                              Edit
                            </button>{" "}
                            <button type="button" className="text-destructive underline underline-offset-2" disabled={pending} onClick={() => removePlacement(pl.id)}>
                              Remove
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              ) : null}
            </li>
          ))}
        </ul>
      )}

      <PartnerDialog partner={editing === "new" ? null : editing} open={editing !== null} onClose={() => setEditing(null)} />
      {placing ? <PlacementDialog partner={placing.partner} placement={placing.placement} open onClose={() => setPlacing(null)} /> : null}
    </div>
  );
}

function PartnerDialog({ partner, open, onClose }: { partner: PartnerAdminRow | null; open: boolean; onClose: () => void }) {
  const router = useRouter();
  const [state, action, pending] = useActionState<AdminState, FormData>(
    async (prev, fd) => {
      const r = await savePartner(prev, fd);
      if (r.ok) {
        toast(r.message);
        onClose();
        router.refresh();
      }
      return r;
    },
    { ok: false, message: "" },
  );
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <form action={action} className="space-y-3">
          <DialogHeader>
            <DialogTitle>{partner ? "Edit partner" : "Add partner"}</DialogTitle>
            <DialogDescription>Shown on /partners. Sponsored and affiliate relationships are labelled.</DialogDescription>
          </DialogHeader>
          {partner ? <input type="hidden" name="id" value={partner.id} /> : null}
          <Field label="Name" name="name" defaultValue={partner?.name} required />
          <Field label="Slug" name="slug" defaultValue={partner?.slug} required placeholder="lowercase-with-hyphens" />
          <Field label="Website" name="url" type="url" defaultValue={partner?.url} required placeholder="https://" />
          <Field label="Logo URL (optional)" name="logo_url" type="url" defaultValue={partner?.logo_url ?? ""} />
          <div className="space-y-1.5">
            <Label htmlFor="blurb">Blurb</Label>
            <Textarea id="blurb" name="blurb" defaultValue={partner?.blurb ?? ""} maxLength={600} rows={3} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="category">Category</Label>
              <select id="category" name="category" defaultValue={partner?.category ?? "other"} className="h-9 w-full rounded-md border bg-background px-2 text-sm">
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="relationship">Relationship</Label>
              <select id="relationship" name="relationship" defaultValue={partner?.relationship ?? "partner"} className="h-9 w-full rounded-md border bg-background px-2 text-sm">
                {relationships.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Position" name="position" type="number" defaultValue={String(partner?.position ?? 0)} />
            <label className="flex items-end gap-2 pb-2 text-sm">
              <input type="checkbox" name="is_active" value="on" defaultChecked={partner?.is_active ?? true} /> Active
            </label>
          </div>
          {state.message && !state.ok ? (
            <p className="text-sm text-destructive" role="alert">
              {state.message}
            </p>
          ) : null}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Saving" : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function PlacementDialog({ partner, placement, open, onClose }: { partner: PartnerAdminRow; placement: Placement | null; open: boolean; onClose: () => void }) {
  const router = useRouter();
  const [state, action, pending] = useActionState<AdminState, FormData>(
    async (prev, fd) => {
      const r = await savePlacement(prev, fd);
      if (r.ok) {
        toast(r.message);
        onClose();
        router.refresh();
      }
      return r;
    },
    { ok: false, message: "" },
  );
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <form action={action} className="space-y-3">
          <DialogHeader>
            <DialogTitle>{placement ? "Edit placement" : `New placement for ${partner.name}`}</DialogTitle>
            <DialogDescription>Rail: one card in the right rail. Topic list: one row after the fifth topic.</DialogDescription>
          </DialogHeader>
          {placement ? <input type="hidden" name="id" value={placement.id} /> : null}
          <input type="hidden" name="partner_id" value={partner.id} />
          <div className="space-y-1.5">
            <Label htmlFor="slot">Slot</Label>
            <select id="slot" name="slot" defaultValue={placement?.slot ?? "rail"} className="h-9 w-full rounded-md border bg-background px-2 text-sm">
              <option value="rail">Right rail</option>
              <option value="topic_list">Topic list</option>
            </select>
          </div>
          <Field label="Headline (90 characters)" name="headline" defaultValue={placement?.headline} required maxLength={90} />
          <div className="space-y-1.5">
            <Label htmlFor="body">Body (rail only, 240 characters)</Label>
            <Textarea id="body" name="body" defaultValue={placement?.body ?? ""} maxLength={240} rows={2} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Button label" name="cta_label" defaultValue={placement?.cta_label ?? "Find out more"} maxLength={40} />
            <Field label="Link (blank uses the partner site)" name="url" type="url" defaultValue={placement?.url ?? ""} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Starts" name="starts_at" type="datetime-local" defaultValue={toLocalInput(placement?.starts_at ?? new Date().toISOString())} required />
            <Field label="Ends (blank for open)" name="ends_at" type="datetime-local" defaultValue={toLocalInput(placement?.ends_at ?? null)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Weight (share of rotation)" name="weight" type="number" defaultValue={String(placement?.weight ?? 1)} />
            <label className="flex items-end gap-2 pb-2 text-sm">
              <input type="checkbox" name="is_active" value="on" defaultChecked={placement?.is_active ?? true} /> Active
            </label>
          </div>
          {state.message && !state.ok ? (
            <p className="text-sm text-destructive" role="alert">
              {state.message}
            </p>
          ) : null}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Saving" : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, name, ...rest }: { label: string; name: string } & React.ComponentProps<typeof Input>) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={name}>{label}</Label>
      <Input id={name} name={name} {...rest} />
    </div>
  );
}
