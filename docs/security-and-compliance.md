# Security and compliance

Record of the September 2026 review (database, application, legal and privacy)
and what is still open. Not legal advice.

## Fixed in code (28 September 2026)

Database (migration 20260928001900, checked by `npm run test:db`):

- Members can no longer write post HTML; posts are always rendered from Markdown through the sanitiser (stored XSS).
- Server-owned columns (pinned, locked, counters, dates, hidden, solution) are forced on insert as well as update.
- Trust levels cannot be farmed: reading stats are clamped, members cannot write their own daily stats, no self-likes, reputation and presence columns are server-owned.
- Private categories stay private in notifications, mentions, subscriptions, likes, revisions, unread counts and deal lists.
- Rate limits, trust recompute, counter refresh and sponsor event functions are server-only.
- Anonymous posts count towards daily caps; the real author is never written to the post row.
- Topics cannot be moved into a forum the author could not post in; a solution must be a reply in the same topic.
- New members cannot post links or mass-mention through the API; mentions are capped per post.
- Avatars must come from our storage; push endpoints must be real browser push services.
- Reports open to every member, with reasons for illegal content, harassment, scams, child safety, defamation and copyright.

Storage (migration 20260928002000): members cannot upload directly; the server re-encodes every image, which strips GPS and other metadata.

Application:

- Content Security Policy, HSTS, Permissions-Policy, frame blocking.
- Post images only from our own storage (no tracking pixels).
- Safe redirects after sign-in (no open redirect).
- One login message whether or not an account exists (no account enumeration).
- Bot check fails closed in production if not configured.
- Server-side rate limits on posting, likes, reports, votes, previews, uploads, sign-ups, newsletter and contact.
- Timing-safe cron secret checks.
- Analytics only after consent, never keyed on email, no session recording.

Legal and privacy pages and flows: privacy policy, terms, cookies, about (with funding and pen-name disclosure), accessibility statement, contact form, public report form, staff inbox with a 3-year record, self-serve data download and account deletion, 18+ and terms checkboxes at sign-up, double opt-in newsletter with one-click unsubscribe, "Ad" labels, standard "not advice" notes, daily data clean-up.

## Still open in code (low risk, noted for later)

- Profile rows are readable through the API in full, including suspension reason and email preferences. Fix by moving private columns to a separate table.
- The CSP allows inline scripts, which Next.js needs without per-request nonces. A nonce-based CSP via `proxy.ts` would be stronger.
- Site-wide stats and streak counts include topics in private forums (there are none yet).
- Sign-up falls back to the email's first part as username if none is given (the form always gives one).

## Needs the owner (cannot be done in code)

1. Pay the ICO data protection fee: https://ico.org.uk/for-organisations/data-protection-fee/ . Put the registration number in `NEXT_PUBLIC_ICO_NUMBER`.
2. Decide the legal name or trading name, a contact email and a geographic address to publish (a virtual office is fine). Set `NEXT_PUBLIC_LEGAL_NAME`, `NEXT_PUBLIC_LEGAL_ADDRESS`, `NEXT_PUBLIC_CONTACT_EMAIL` (and `NEXT_PUBLIC_COMPANY_NUMBER` if a company).
3. Write and date the Online Safety Act illegal content risk assessment and children's access assessment, using Ofcom's guidance for small services: https://www.ofcom.org.uk/online-safety/illegal-and-harmful-content/check-how-to-comply-with-the-illegal-content-rules . Keep them for at least 3 years and review before big changes (private messages, payments).
4. Name the person responsible for illegal content safety and handling complaints, and check the staff inbox (`/admin/messages`) at least every two days.
5. Accept each provider's data processing terms (Supabase, Vercel, Resend, PostHog, Cloudflare) and confirm the Supabase project region.
6. In the Supabase dashboard: turn on Auth CAPTCHA (Turnstile), set OTP expiry to 10 minutes or less, and check the auth rate limits.
7. Rotate the Supabase secret key that was shared in chat, and update `.env.local` and Vercel.
8. Have a solicitor read `/terms` and `/privacy` before launch.
9. Know the breach process: report a personal data breach to the ICO within 72 hours: https://ico.org.uk/for-organisations/report-a-breach/
