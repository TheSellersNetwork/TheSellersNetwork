import "server-only";
import { unstable_cache } from "next/cache";
import { createClient } from "@supabase/supabase-js";

export type RelatedThread = {
  id: string;
  title: string;
  slug: string;
  short_id: string;
  reply_count: number;
  is_solved: boolean;
  created_at: string;
  category: { slug: string; name: string };
};

export type RelatedThreads = { threads: RelatedThread[]; askCategory: string | null };

type Row = Omit<RelatedThread, "category"> & { category: { slug: string; name: string; is_private: boolean } | { slug: string; name: string; is_private: boolean }[] | null };

/*
  Up to five recent threads from the forums a guide is filed under (its
  `categories` frontmatter holds forum slugs), newest first. Uses the anon key
  with no cookies, so what it returns is exactly what a signed-out visitor may
  read, and it can be cached for everyone. Private forums are excluded twice:
  by RLS and by the filter here. Any error (no database, table missing) gives
  an empty list and the section hides.
*/
async function load(categorySlugs: string[]): Promise<RelatedThreads> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key || categorySlugs.length === 0) return { threads: [], askCategory: null };
  try {
    const supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data: cats, error: catError } = await supabase.from("categories").select("id, slug, parent_id, is_private").in("slug", categorySlugs);
    if (catError || !cats) return { threads: [], askCategory: null };
    const open = cats.filter((c) => !c.is_private);
    if (open.length === 0) return { threads: [], askCategory: null };
    // Ask in the most specific public forum the guide is filed under: a subforum before its parent, in frontmatter order.
    const ordered = categorySlugs.map((s) => open.find((c) => c.slug === s)).filter((c): c is (typeof open)[number] => !!c);
    const askCategory = (ordered.find((c) => c.parent_id) ?? ordered[0])?.slug ?? null;

    const { data, error } = await supabase
      .from("topics")
      .select("id, title, slug, short_id, reply_count, is_solved, created_at, category:categories!inner (slug, name, is_private), opening:posts!posts_topic_id_fkey!inner (id)")
      .in("category_id", open.map((c) => c.id))
      .eq("category.is_private", false)
      // Live threads only: the opening post must be neither deleted nor hidden by a moderator.
      .eq("opening.post_number", 1)
      .eq("opening.is_deleted", false)
      .eq("opening.is_hidden", false)
      .is("deleted_at", null)
      .eq("is_unlisted", false)
      .order("created_at", { ascending: false })
      .limit(5);
    if (error || !data) return { threads: [], askCategory };
    const threads = (data as unknown as Row[]).flatMap((row): RelatedThread[] => {
      const cat = Array.isArray(row.category) ? row.category[0] : row.category;
      if (!cat || cat.is_private) return [];
      const { id, title, slug, short_id, reply_count, is_solved, created_at } = row;
      return [{ id, title, slug, short_id, reply_count, is_solved, created_at, category: { slug: cat.slug, name: cat.name } }];
    });
    return { threads, askCategory };
  } catch {
    return { threads: [], askCategory: null };
  }
}

const cached = unstable_cache(load, ["guide-related-threads"], { revalidate: 300, tags: ["guide-related-threads"] });

export function getRelatedThreads(categorySlugs: string[]): Promise<RelatedThreads> {
  return cached([...new Set(categorySlugs)]);
}
