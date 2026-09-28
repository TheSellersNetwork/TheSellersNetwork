"use server";

import { randomBytes } from "node:crypto";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";

const TOKEN = /^[A-Za-z0-9_-]{20,64}$/;

/*
  Confirms a newsletter sign-up. Only a button press does this, never opening
  the link: email security scanners open every link in an email, and a
  confirmation they trigger is not the subscriber's consent.
*/
export async function confirmNewsletter(formData: FormData): Promise<void> {
  const token = String(formData.get("token") ?? "");
  let ok = false;
  if (TOKEN.test(token)) {
    try {
      // A fresh token replaces the used one and becomes the unsubscribe key.
      const { data } = await createAdminClient()
        .from("email_subscribers")
        .update({ status: "active", confirmed_at: new Date().toISOString(), confirm_token: randomBytes(24).toString("base64url") })
        .eq("confirm_token", token)
        .eq("status", "pending")
        .select("id");
      ok = (data?.length ?? 0) > 0;
    } catch {
      ok = false;
    }
  }
  redirect(`/newsletter/confirm?done=${ok ? 1 : 0}`);
}
