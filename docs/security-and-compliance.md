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

## Fixed after the second audit (28 September 2026)

- MDX content (guides and the auto-published change posts) can no longer inject HTML: raw tags, imports and exports are stripped at render (`src/lib/markdown/remark-no-raw-html.ts`), and `npm run changes:check` rejects raw HTML, non-https sources and unsafe link schemes before anything is published.
- Newsletter confirm and unsubscribe need a button press; opening the link (as email scanners do) changes nothing. One-click unsubscribe from mail apps still works by POST.
- Account deletion runs in one database transaction (`delete_member`, migration 20260928002100).
- Contact form links must be http(s), and the staff inbox only links those.
- Consent records (terms accepted, age confirmed) cannot be edited by members.
- The real author of an anonymous post cannot like it.
- No email addresses in rate-limit keys; all hashes use a secret salt, and production refuses to hash without one (`PLACEMENT_HASH_SALT`).
- Animated GIF uploads are capped at 50 frames.

## Still open in code (low risk, noted for later)

- Profile rows are readable through the API in full, including suspension reason and email preferences. Fix by moving private columns to a separate table.
- The CSP allows inline scripts, which Next.js needs without per-request nonces. A nonce-based CSP via `proxy.ts` would be stronger.
- Site-wide stats and streak counts include topics in private forums (there are none yet).
- Sign-up falls back to the email's first part as username if none is given (the form always gives one).

## Defamation complaints (Defamation Act 2013 s5, added 30 September 2026)

To keep the website operator defence in s5, a defamation complaint must be handled as the Defamation (Operators of Websites) Regulations 2013 (SI 2013/3028) set out. A solicitor should review this process and the copy before launch.

- **Notice.** `/report?kind=defamation` asks for everything s5(6) and reg 2 need: name, email, the statement, where it is (a link on this site), its meaning, what is inaccurate or unsupported opinion, confirmation the complainant cannot identify the poster, and consent (yes or no) to sharing their name and their email with the poster. It also asks about earlier removals (Schedule para 9). The server checks it all; notices are stored in `defamation_notices` (migration 20260930002300, staff only, complaint fields cannot be edited). A flag with the defamation reason is not a notice, and the flag dialog points to the form.
- **Incomplete notice (reg 4).** Without the confirmation the notice is stored but marked invalid, and the receipt email tells the complainant what is missing and what a notice must contain.
- **Deadlines.** "Within 48 hours" leaves out weekends, Good Friday, Christmas Day and England and Wales bank holidays (reg 1(3)). The poster has until midnight at the end of the 5th day after the day they are notified. Both are worked out in UK time in `src/lib/defamation/deadlines.ts` (tested, including clock changes). Special one-off bank holidays must be added there when announced.
- **Staff steps** at `/admin/messages`, each recorded with its time and logged in `moderation_log`:
  1. Check we can contact the poster privately (account email or private message). If not, remove the statement within 48 hours of receipt (para 3).
  2. Otherwise, within 48 hours of receipt, send the poster the notification (copy the template on the notice; it hides the complainant's name and email unless they agreed) and acknowledge the complainant (paras 2 and 4).
  3. No reply by the poster's deadline, or a reply that agrees to removal, or a refusal without full name and postal address: remove within 48 hours and tell the complainant (paras 5 to 7).
  4. Refusal with full name and postal address: tell the complainant within 48 hours; give the poster's details only if the poster agreed (para 8).
  5. Repeat posting after two or more earlier removals for the same complainant: remove within 48 hours without contacting the poster (para 9).
- Nothing is emailed to posters automatically. Notices that arrive by email or post are not in the inbox and must be tracked by hand with the same deadlines. [TOM: decide who checks the inbox on working days so 48 hours is never missed]

## Needs the owner (cannot be done in code)

1. Pay the ICO data protection fee: https://ico.org.uk/for-organisations/data-protection-fee/ . Put the registration number in `NEXT_PUBLIC_ICO_NUMBER`.
2. Decide the legal name or trading name, a contact email and a geographic address to publish (a virtual office is fine). Set `NEXT_PUBLIC_LEGAL_NAME`, `NEXT_PUBLIC_LEGAL_ADDRESS`, `NEXT_PUBLIC_CONTACT_EMAIL` (and `NEXT_PUBLIC_COMPANY_NUMBER` if a company).
3. Write and date the Online Safety Act illegal content risk assessment and children's access assessment, using Ofcom's guidance for small services: https://www.ofcom.org.uk/online-safety/illegal-and-harmful-content/check-how-to-comply-with-the-illegal-content-rules . Keep them for at least 3 years and review before big changes (private messages, payments).
4. Name the person responsible for illegal content safety and handling complaints, and check the staff inbox (`/admin/messages`) at least every two days.
5. Accept each provider's data processing terms (Supabase, Vercel, Resend, PostHog, Cloudflare) and confirm the Supabase project region.
6. In the Supabase dashboard: turn on Auth CAPTCHA (Turnstile), set OTP expiry to 10 minutes or less, and check the auth rate limits.
7. Set `PLACEMENT_HASH_SALT` in Vercel (any random string of 16+ characters; a copy is in `.env.local`). Without it, analytics and sponsor counting switch themselves off in production.
8. Rotate the Supabase secret key that was shared in chat, and update `.env.local` and Vercel.
9. Have a solicitor read `/terms` and `/privacy` before launch.
10. Know the breach process: report a personal data breach to the ICO within 72 hours: https://ico.org.uk/for-organisations/report-a-breach/
