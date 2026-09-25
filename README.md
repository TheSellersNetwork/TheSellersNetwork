# The Sellers Network

The community forum, blog and mentoring site for UK resellers, whatever platform they sell on.

## Getting started

```bash
npm ci --legacy-peer-deps
cp .env.example .env.local   # then fill in the values
npm run dev
```

Open http://localhost:3000. The brand chooser is at http://localhost:3000/brand.

## Scripts

| Script               | What it does                                  |
| -------------------- | --------------------------------------------- |
| `npm run dev`        | Local development server                      |
| `npm run build`      | Production build                              |
| `npm run lint`       | ESLint                                        |
| `npm run typecheck`  | TypeScript, no emit                           |
| `npm run test:unit`  | Vitest                                        |
| `npm run test:e2e`   | Playwright against a production build         |
| `npm run lighthouse` | Lighthouse CI, fails under 90 in any category |

## Stack

Next.js (App Router, TypeScript) on Vercel, Supabase, Tailwind and shadcn/ui, MDX, PostHog.
See `CLAUDE.md` for working rules and `docs/BRIEF.md` for the full build brief.
