import { NextResponse } from "next/server";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { createAdminClient } from "@/lib/supabase/admin";
import { renderMarkdown } from "@/lib/markdown/render";

/*
  Posts the weekly numbers thread. Scheduled in vercel.json for Monday 07:00
  UTC and protected by CRON_SECRET. The template lives in
  content/templates/weekly-numbers.md; Tom edits that file, never this one.
  The previous week's thread is unpinned so only the current one is pinned.
*/
export async function GET(request: Request) {
  const auth = request.headers.get("authorization");
  if (!process.env.CRON_SECRET || auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ message: "Unauthorised" }, { status: 401 });
  }

  const admin = createAdminClient();
  const authorEmail = process.env.SEED_AUTHOR_EMAIL;
  if (!authorEmail) return NextResponse.json({ message: "SEED_AUTHOR_EMAIL is not set" }, { status: 500 });

  const { data: users } = await admin.auth.admin.listUsers({ perPage: 1000 });
  const author = users?.users.find((u) => u.email?.toLowerCase() === authorEmail.toLowerCase());
  const { data: category } = await admin.from("categories").select("id").eq("slug", "wins-and-case-studies").maybeSingle();
  if (!author || !category) return NextResponse.json({ message: "Author or category missing. Run the seed script." }, { status: 500 });

  const weekOf = new Date();
  const title = `What did you sell this week? Week of ${weekOf.toLocaleDateString("en-GB", { day: "numeric", month: "long" })}`;
  const { data: existing } = await admin.from("topics").select("id").eq("category_id", category.id).eq("title", title).maybeSingle();
  if (existing) return NextResponse.json({ message: "Already posted this week", topic_id: existing.id });

  const template = await readFile(path.join(process.cwd(), "content", "templates", "weekly-numbers.md"), "utf8");
  const body_md = template.replace(/\{\{week\}\}/g, weekOf.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }));

  await admin.from("topics").update({ is_pinned: false }).eq("category_id", category.id).eq("is_pinned", true).ilike("title", "What did you sell this week%");

  const { data: topic, error } = await admin.from("topics").insert({ title, category_id: category.id, author_id: author.id, is_pinned: true }).select("id, slug, short_id").single();
  if (error || !topic) return NextResponse.json({ message: error?.message ?? "Insert failed" }, { status: 500 });

  await admin.from("posts").insert({ topic_id: topic.id, author_id: author.id, body_md, body_html: await renderMarkdown(body_md) });
  return NextResponse.json({ message: "Posted", url: `/community/t/${topic.slug}/${topic.short_id}` });
}
