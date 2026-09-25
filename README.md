# The Sellers Network

The community forum, blog and mentoring site for UK resellers, whatever platform they sell on.

## Getting started

```bash
npm ci --legacy-peer-deps
cp .env.example .env.local   # then fill in the values
npm run dev
```

Open http://localhost:3000. The brand chooser is at http://localhost:3000/brand.

## First-time setup on a real Supabase project

1. Create a Supabase project and put its URL, anon key and service role key in `.env.local`.
2. Apply the migrations in order: `supabase db push` with the CLI, or paste each file from
   `supabase/migrations` into the SQL editor. `supabase/migrations/README.md` lists them.
3. In Authentication settings, set the site URL and add `/auth/callback` to the redirect list.
   Keep "Confirm email" on: members must verify before their first post.
4. Sign up through the site with Tom's email, then set `SEED_AUTHOR_EMAIL` to it and run
   `npm run seed`. That makes the account staff, creates every launch category with a pinned
   "Read this first" placeholder, and optionally loads topics from a CSV
   (`npm run seed -- --csv docs/seed-topics.csv`, format in `docs/seed-topics.example.csv`).
5. Add Resend, Turnstile and PostHog keys when those accounts exist. Everything degrades
   quietly without them: emails are logged, Turnstile is skipped, analytics is silent.

## Scripts

| Script               | What it does                                                  |
| -------------------- | ------------------------------------------------------------- |
| `npm run dev`        | Local development server                                      |
| `npm run build`      | Production build                                              |
| `npm run lint`       | ESLint                                                        |
| `npm run typecheck`  | TypeScript, no emit                                           |
| `npm run test:unit`  | Vitest                                                        |
| `npm run test:db`    | Applies every migration to PGlite, exercises RLS, rolls back  |
| `npm run test:e2e`   | Playwright against a production build                         |
| `npm run lighthouse` | Lighthouse CI, fails under 90 in any category                 |
| `npm run seed`       | Launch categories, intro placeholders, optional CSV topics    |
| `npm run blog:sync`  | Creates discussion threads for published blog posts           |
| `npm run roundup`    | Drafts the Friday roundup from the week's solved threads      |
| `npm run ask-tom:digest` | Drafts the monthly Ask Tom blog post from answered questions |

## Partners and sponsor slots

`/partners` lists partners by category with sponsored and affiliate labels. Staff manage them at
`/admin/partners`, including placements: a card in the right rail or a row after the fifth topic,
running between two dates. Impressions (deduplicated per viewer per day, no IPs stored) and clicks
are counted in the database and sent to PostHog. Outbound links go through `/go/...`.

## Recurring things

- Monday 07:00 UTC: `/api/cron/weekly-thread` posts the weekly numbers thread from
  `content/templates/weekly-numbers.md` (Vercel cron, protected by `CRON_SECRET`).
- Ask Tom: staff open and close the monthly window at `/admin`. Answers Tom accepts are tagged and
  `npm run ask-tom:digest` drafts the blog post.

## Content

- `content/blog/*.mdx` blog posts. Frontmatter: title, excerpt, platforms, category,
  related_topic_ids, cover, published. Leave `published` empty for a draft.
- `content/guides/*.mdx` guides. Frontmatter: title, excerpt, categories (forum slugs the guide
  appears beside), module, order, published.
- `content/blog/templates/` holds a starter for each content type: evergreen guide, case study,
  news reaction, member spotlight, plus the roundup template in `content/blog/_roundup-template.mdx`.
- `<Placeholder>` and `<Signup source="..." />` are the two components available in MDX.

## Stack

Next.js (App Router, TypeScript) on Vercel, Supabase, Tailwind and shadcn/ui, MDX, Tiptap,
Resend, PostHog, Cloudflare Turnstile. See `CLAUDE.md` for working rules and `docs/BRIEF.md`
for the full build brief.
