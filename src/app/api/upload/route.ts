import { NextResponse } from "next/server";
import sharp from "sharp";
import { getCurrentUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { allowAction } from "@/lib/rate-limit";

const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

/*
  Uploads a post image. The file is decoded and re-encoded as WebP on the
  server, which drops EXIF data (GPS location, camera serials) whatever the
  browser sent, and proves it really is an image. Members cannot write to
  Storage directly; this route uploads with the service role into the
  member's own folder.
*/
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ message: "Sign in to upload images." }, { status: 401 });
  if (!user.emailConfirmed) return NextResponse.json({ message: "Confirm your email before uploading images." }, { status: 403 });
  if (user.profile.is_suspended) return NextResponse.json({ message: "Your account is suspended." }, { status: 403 });

  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File)) return NextResponse.json({ message: "No file received." }, { status: 400 });
  if (!ALLOWED.has(file.type)) return NextResponse.json({ message: "Images only: JPEG, PNG, WebP or GIF." }, { status: 415 });
  if (file.size > MAX_BYTES) return NextResponse.json({ message: "Images must be under 5 MB." }, { status: 413 });

  if (!(await allowAction(`upload:${user.id}`, 60, "1 hour"))) {
    return NextResponse.json({ message: "Too many uploads. Try again later." }, { status: 429 });
  }

  let output: Buffer;
  try {
    const animated = file.type === "image/gif";
    // The pixel limit applies per frame, so animated GIFs also get a frame cap to keep decoding cheap.
    output = await sharp(Buffer.from(await file.arrayBuffer()), { animated, pages: animated ? 50 : 1, limitInputPixels: 40_000_000 })
      .rotate()
      .resize({ width: 2000, height: 2000, fit: "inside", withoutEnlargement: true })
      .webp({ quality: 82 })
      .toBuffer();
  } catch {
    return NextResponse.json({ message: "That file could not be read as an image." }, { status: 415 });
  }

  let admin;
  try {
    admin = createAdminClient();
  } catch {
    return NextResponse.json({ message: "Uploads are not available right now." }, { status: 503 });
  }

  const path = `${user.id}/${Date.now()}-${crypto.randomUUID().slice(0, 8)}.webp`;
  const { error } = await admin.storage.from("post-images").upload(path, output, { contentType: "image/webp", cacheControl: "31536000" });
  if (error) return NextResponse.json({ message: "Upload failed. Try again." }, { status: 500 });

  const { data } = admin.storage.from("post-images").getPublicUrl(path);
  return NextResponse.json({ url: data.publicUrl });
}
