/*
  Beginner paths: ordered lists of guides and blog posts, defined in
  content/paths.json. Pure helpers shared by the server loader, the client
  progress components and the unit tests.
*/

export type StepKind = "guide" | "blog";

/* A step as written in paths.json: "guide:photos-on-a-phone" or "blog:every-amazon-fee-on-one-sale". */
export type StepKey = `${StepKind}:${string}`;

export type PathDefinition = { slug: string; title: string; description: string; steps: string[] };

export type PathStep = { key: StepKey; kind: StepKind; slug: string; title: string; excerpt: string; href: string };

export type ReadingPath = { slug: string; title: string; description: string; steps: PathStep[] };

export function parseStepKey(value: unknown): { kind: StepKind; slug: string } | null {
  if (typeof value !== "string") return null;
  const m = /^(guide|blog):([a-z0-9-]+)$/.exec(value.trim());
  return m ? { kind: m[1] as StepKind, slug: m[2] } : null;
}

export function stepKey(kind: StepKind, slug: string): StepKey {
  return `${kind}:${slug}`;
}

/* Reads paths.json, dropping anything malformed. Path slugs must be unique and URL safe. */
export function parsePaths(raw: unknown): PathDefinition[] {
  const list = raw && typeof raw === "object" && Array.isArray((raw as { paths?: unknown }).paths) ? (raw as { paths: unknown[] }).paths : [];
  const seen = new Set<string>();
  const out: PathDefinition[] = [];
  for (const p of list) {
    if (!p || typeof p !== "object") continue;
    const { slug, title, description, steps } = p as Record<string, unknown>;
    if (typeof slug !== "string" || !/^[a-z0-9-]+$/.test(slug) || seen.has(slug)) continue;
    if (typeof title !== "string" || !title.trim() || !Array.isArray(steps)) continue;
    seen.add(slug);
    out.push({
      slug,
      title: title.trim(),
      description: typeof description === "string" ? description.trim() : "",
      steps: steps.filter((s): s is string => parseStepKey(s) !== null).map((s) => s.trim()),
    });
  }
  return out;
}

/* How many of a path's steps are in the reader's read list. */
export function pathProgress(steps: { key: string }[], read: readonly string[]): { done: number; total: number } {
  const set = new Set(read);
  return { done: steps.filter((s) => set.has(s.key)).length, total: steps.length };
}

/* Every path an article sits in, with its position and the step after it. */
export function pathMemberships(paths: ReadingPath[], key: string): { path: ReadingPath; index: number; next: PathStep | null }[] {
  return paths.flatMap((path) => {
    const index = path.steps.findIndex((s) => s.key === key);
    return index === -1 ? [] : [{ path, index, next: path.steps[index + 1] ?? null }];
  });
}

/* Stored read list: an array of unique step keys. Anything else in storage is ignored. */
export function parseReadList(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const value: unknown = JSON.parse(raw);
    return Array.isArray(value) ? [...new Set(value.filter((v): v is string => typeof v === "string" && parseStepKey(v) !== null))] : [];
  } catch {
    return [];
  }
}
