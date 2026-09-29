import Link from "next/link";
import type { Metadata } from "next";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { feeData } from "@/lib/tools/fees";
import { cleanInputs, isCalcKind, kindLabel, openHref, outcome, outcomeChanged, type Outcome } from "@/components/tools/calculator/model";
import { SavedCalculationRow, type SavedView } from "@/components/tools/calculator/saved-row";
import { isMissingTable, SAVED_LIMIT, type SavedRow } from "./data";

export const metadata: Metadata = { title: "Your saved calculations", robots: { index: false } };

const checked = new Date(`${feeData.checked}T00:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });

async function load(userId: string): Promise<{ rows: SavedRow[]; missing: boolean; failed: boolean }> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("saved_calculations")
      .select("id, name, platform, inputs, result, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(SAVED_LIMIT);
    if (error) return { rows: [], missing: isMissingTable(error), failed: !isMissingTable(error) };
    return { rows: (data ?? []) as SavedRow[], missing: false, failed: false };
  } catch {
    return { rows: [], missing: false, failed: true };
  }
}

export default async function SavedCalculationsPage() {
  const user = await requireUser("/account/calculations");
  const { rows, missing, failed } = await load(user.id);

  const views: SavedView[] = rows.flatMap((row) => {
    if (!isCalcKind(row.platform)) return [];
    const inputs = cleanInputs(row.platform, row.inputs);
    if (!inputs) return [];
    const now = outcome(row.platform, inputs);
    const saved = row.result && typeof row.result === "object" ? (row.result as Partial<Outcome>) : null;
    return [
      {
        id: row.id,
        name: row.name,
        platform: kindLabel(row.platform),
        href: openHref(row.platform, inputs),
        created: new Date(row.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }),
        now,
        saved: outcomeChanged(saved, now) ? (saved as Outcome) : null,
      },
    ];
  });

  return (
    <main id="main" className="mx-auto w-full max-w-3xl flex-1 px-4 py-10 sm:px-6">
      <nav aria-label="Breadcrumb" className="text-sm text-muted-foreground">
        <Link href="/account" className="hover:underline">
          Account
        </Link>
      </nav>
      <h1 className="mt-1 text-2xl font-semibold tracking-tight">Your saved calculations</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Each result is worked out again with the fees we hold today (checked {checked}). Where fees have changed since you saved it, the result from then is shown too. Only you can see these.
      </p>

      {missing ? (
        <p className="mt-8 rounded-lg border bg-card p-4 text-sm">Saved calculations are not switched on yet.</p>
      ) : failed ? (
        <p className="mt-8 rounded-lg border bg-card p-4 text-sm">Your saved calculations could not be loaded. Try again in a moment.</p>
      ) : views.length === 0 ? (
        <div className="mt-8 rounded-lg border bg-card p-6 text-sm">
          <p className="font-medium">Nothing saved yet</p>
          <p className="mt-1 text-muted-foreground">Work something out in the fee calculator, then press Save this calculation under the result.</p>
          <Link href="/tools/calculator" className="mt-3 inline-block underline">
            Open the fee calculator
          </Link>
        </div>
      ) : (
        <>
          <p className="mt-6 text-sm text-muted-foreground">
            {views.length} of {SAVED_LIMIT}
          </p>
          <ul className="mt-2 space-y-3">
            {views.map((v) => (
              <SavedCalculationRow key={v.id} item={v} />
            ))}
          </ul>
        </>
      )}
    </main>
  );
}
