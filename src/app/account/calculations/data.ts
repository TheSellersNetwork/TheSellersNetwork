import "server-only";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { SavingState } from "@/components/tools/calculator/save-calculation";

/* Saved calculations: at most this many per member (the database enforces it too). */
export const SAVED_LIMIT = 200;

/*
  The saved_calculations table arrives with migration 20260930000300. Until it
  is applied, Supabase answers with "relation does not exist" (42P01) or, via
  PostgREST, "could not find the table" (PGRST205), and the feature hides.
*/
export function isMissingTable(error: { code?: string; message?: string } | null | undefined): boolean {
  if (!error) return false;
  return error.code === "42P01" || error.code === "PGRST205" || /does not exist|could not find the table/i.test(error.message ?? "");
}

/* What the Save button should offer: sign in, save, or nothing because the table is not there yet. */
export type { SavingState };

export async function savingState(): Promise<SavingState> {
  try {
    const user = await getCurrentUser();
    const supabase = await createClient();
    // Signed out, this is refused with "permission denied", which still shows the table is there.
    const { error } = await supabase.from("saved_calculations").select("id").limit(1);
    if (isMissingTable(error)) return "unavailable";
    if (!user) return "signed-out";
    return error ? "unavailable" : "ready";
  } catch {
    return "unavailable";
  }
}

export type SavedRow = { id: string; name: string; platform: string; inputs: unknown; result: unknown; created_at: string };
