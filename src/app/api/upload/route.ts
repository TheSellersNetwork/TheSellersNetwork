import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

/*
  Uploads a post image to Supabase Storage under the member's own folder.
  Storage RLS enforces the folder rule; this checks size, type and trust.
*/
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ message: "Sign in to upload images." }, { status: 401 });
  if (!user.emailConfirmed) return NextResponse.json({ message: "Confirm your email before uploading images." }, { status: 403 });

  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File)) return NextResponse.json({ message: "No file received." }, { status: 400 });
  if (!ALLOWED.has(file.type)) return NextResponse.json({ message: "Images only: JPEG, PNG, WebP or GIF." }, { status: 415 });
  if (file.size > MAX_BYTES) return NextResponse.json({ message: "Images must be under 5 MB." }, { status: 413 });

  const supabase = await createClient();
  const { data: allowed } = await supabase.rpc("check_rate_limit", { p_key: `upload:${user.id}`, p_limit: 60, p_window: "1 hour" });
  if (allowed === false) return NextResponse.json({ message: "Too many uploads. Try again later." }, { status: 429 });

  const ext = file.type === "image/gif" ? "gif" : file.type === "image/png" ? "png" : file.type === "image/jpeg" ? "jpg" : "webp";
  const path = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

  const { error } = await supabase.storage.from("post-images").upload(path, file, { contentType: file.type, cacheControl: "31536000" });
  if (error) return NextResponse.json({ message: "Upload failed. Try again." }, { status: 500 });

  const { data } = supabase.storage.from("post-images").getPublicUrl(path);
  return NextResponse.json({ url: data.publicUrl });
}
