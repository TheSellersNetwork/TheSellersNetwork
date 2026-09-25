# The Sellers Network

Community forum, blog and mentoring site for UK resellers on every platform. The full build
brief is in `docs/BRIEF.md`. Read it before writing code. If something is not covered, ask Tom.

## Rules that apply to every change

- One task per pull request, in the order in `docs/BRIEF.md` under "Build order".
- Before each task, state what you will build and any decision Tom needs to make.
- UK English everywhere: code comments, copy, errors, emails. No em dashes. No exclamation marks
  in user-facing copy.
- Tom writes all content. Use `[TOM: ...]` placeholders. Never invent seller advice, numbers,
  testimonials, members or posts.
- Every migration is reversible. Every table has row-level security. The Supabase service key
  is server-only (`src/lib/supabase/admin.ts`, guarded by `server-only`).
- Colours come from `src/styles/tokens.css`. Do not hard-code hex values in components.
- `.env.local` is never committed. `.env.example` lists every variable.

## Commands

- `npm run dev` local server
- `npm run lint`, `npm run typecheck`, `npm run test:unit`, `npm run test:e2e`, `npm run lighthouse`
- `npm ci --legacy-peer-deps` (vitest's React plugin and Next disagree on a Babel peer)

## Layout

- `src/app` routes (App Router). `src/components/ui` is shadcn, do not hand-edit.
- `src/lib/supabase` browser, server and admin clients. `src/proxy.ts` refreshes sessions.
- `src/lib/site.ts` site-wide config: name, brand palette, marketplaces list.
- `src/styles/tokens.css` design tokens, four palettes selectable with `data-brand` on `<html>`.
- `/brand` is an internal, noindexed page for choosing palette and logo.
- `supabase/migrations` SQL migrations (task 2 onwards).
