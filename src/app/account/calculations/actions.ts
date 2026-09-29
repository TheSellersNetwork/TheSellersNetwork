"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { cleanInputs, defaultName, isCalcKind, outcome } from "@/components/tools/calculator/model";
import { isMissingTable, SAVED_LIMIT } from "./data";

export type SaveResult = { ok: boolean; message: string };

const PATH = "/account/calculations";
const cleanName = (raw: unknown) => (typeof raw === "string" ? raw.replace(/\s+/g, " ").trim().slice(0, 80) : "");
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function problem(error: { code?: string; message?: string }): string {
  if (isMissingTable(error)) return "Saving calculations is not switched on yet.";
  if (error.message?.includes("saved_calculations_limit")) return `You have ${SAVED_LIMIT} saved calculations, the most you can keep. Delete one to save another.`;
  return "That did not save. Try again in a moment.";
}

/* Saves the calculator's current figures under a name. The result is worked out here, not taken from the browser. */
export async function saveCalculation(kind: string, rawInputs: unknown, rawName: string): Promise<SaveResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, message: "Sign in to save calculations." };
  if (!isCalcKind(kind)) return { ok: false, message: "That calculator cannot be saved." };
  const inputs = cleanInputs(kind, rawInputs);
  if (!inputs) return { ok: false, message: "Enter a selling price first." };
  const name = cleanName(rawName) || defaultName(kind, inputs);

  const supabase = await createClient();
  const { count, error: countError } = await supabase.from("saved_calculations").select("id", { count: "exact", head: true }).eq("user_id", user.id);
  if (countError) return { ok: false, message: problem(countError) };
  if ((count ?? 0) >= SAVED_LIMIT) return { ok: false, message: problem({ message: "saved_calculations_limit" }) };

  const { error } = await supabase.from("saved_calculations").insert({ user_id: user.id, name, platform: kind, inputs, result: outcome(kind, inputs) });
  if (error) return { ok: false, message: problem(error) };
  revalidatePath(PATH);
  return { ok: true, message: `Saved as "${name}".` };
}

export async function renameCalculation(id: string, rawName: string): Promise<SaveResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, message: "Sign in again to rename this." };
  const name = cleanName(rawName);
  if (!name) return { ok: false, message: "Give it a name." };
  if (!uuid.test(id)) return { ok: false, message: "That calculation was not found." };
  const supabase = await createClient();
  const { data, error } = await supabase.from("saved_calculations").update({ name }).eq("id", id).eq("user_id", user.id).select("id");
  if (error) return { ok: false, message: problem(error) };
  if (!data?.length) return { ok: false, message: "That calculation was not found." };
  revalidatePath(PATH);
  return { ok: true, message: "Renamed." };
}

export async function deleteCalculation(id: string): Promise<SaveResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, message: "Sign in again to delete this." };
  if (!uuid.test(id)) return { ok: false, message: "That calculation was not found." };
  const supabase = await createClient();
  const { error } = await supabase.from("saved_calculations").delete().eq("id", id).eq("user_id", user.id);
  if (error) return { ok: false, message: problem(error) };
  revalidatePath(PATH);
  return { ok: true, message: "Deleted." };
}
