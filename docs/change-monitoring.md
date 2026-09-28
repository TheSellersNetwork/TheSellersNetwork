# Watching for fee and policy changes

A scheduled task checks the official sources below every morning. It writes a
blog post for anything new, updates posts when something moves on, opens the
forum thread, and publishes. This file is its playbook; edit it to change what
is watched or how.

The running record of what has been checked is `content/changes/_monitor-log.md`.
Read it first, add to it last.

## What counts

A change is worth a post if it alters, for UK sellers on a platform we cover:

- fees, commission, payment or payout terms, or buyer fees that change what sellers net
- postage prices, sizes, delivery days or services
- selling rules, listing rules, returns, disputes, protection or verification
- tax, reporting or product safety rules that affect online sellers

Not worth a post: marketing campaigns, promotions and sales, app feature launches
that change nothing above, US-only or EU-only changes (unless they also apply to
UK sellers or to sales into Northern Ireland), rumours, and anything only in the
press with nothing official to confirm it.

## Sources (official only)

Check each. Use WebSearch and WebFetch; `royalmail.com` blocks automated fetches,
so open those pages and PDFs in the Browser pane in a background tab.

| Platform | Where to look |
|---|---|
| eBay | https://www.ebay.co.uk/sellercentre/news , https://www.ebay.co.uk/help/selling/fees-credits-invoices/selling-fees?id=4822 , eBay UK community announcements board, https://www.ebayinc.com/stories/news/ |
| Amazon | UK Seller Central forum announcements (sellercentral.amazon.co.uk/seller-forums), https://www.aboutamazon.eu/news , https://sell.amazon.co.uk/pricing , rate card PDFs on m.media-amazon.com |
| Vinted | https://www.vinted.co.uk/help , https://www.vinted.co.uk/terms_and_conditions , https://company.vinted.com/newsroom |
| Depop | https://news.depop.com , https://depophelp.zendesk.com/hc/en-gb |
| Etsy | https://www.etsy.com/news , https://www.etsy.com/legal/fees , https://www.etsy.com/legal |
| TikTok Shop | https://seller-uk.tiktok.com/university , TikTok Shop UK policy and commission pages |
| Facebook Marketplace | https://www.facebook.com/help (Marketplace selling and fees), https://about.fb.com/news |
| Whatnot | https://help.whatnot.com , https://blog.whatnot.com |
| Royal Mail | https://www.royalmail.com/current-postage-prices , price guide PDFs, https://www.royalmailgroup.com/en/press-centre/press-releases/ , https://www.ofcom.org.uk/post |
| Evri | https://www.evri.com/news , https://www.evri.com/our-services/our-prices |
| HMRC and GOV.UK | https://www.gov.uk/search/news-and-communications?organisations[]=hm-revenue-customs , the pages linked from `src/lib/tools/tax.ts` (their "Last updated" line shows changes) |

Useful searches as a backstop: `"UK sellers" fee change site:ebay.co.uk`,
`Amazon UK seller fee changes 2027`, `Vinted UK fee change`, each limited to the
last month.

## Each run

1. Read `content/changes/_monitor-log.md` and the frontmatter of every post in
   `content/changes` so you know what is already covered.
2. Check every source. For each item since the last run, decide: new change,
   update to an existing post, or not relevant.
3. **New change:** write `content/changes/<slug>.mdx` following
   `docs/change-style.md` exactly. Every figure from an official page, linked.
   Author: `jamie-callaghan` for eBay, Depop, Royal Mail, Evri and Whatnot;
   `rachel-doyle` for everything else. If the official page is not clear enough
   to explain the change properly, do not publish: record it in the log under
   "Waiting" and look again next run.
4. **Update to an existing post:** edit that post (new dates, a delay, a figure
   confirmed, a deal completed). Add a line to its "Key dates" table and, if the
   status changed, the frontmatter. Do not rewrite what is still true.
5. Run `npm run changes:check`, `npm run typecheck` and `npm run build`. Fix
   anything that fails. Never publish a post that fails a check.
6. Run `npm run changes:sync` to open the forum thread and poll for new posts.
   It writes `discussion:` into the file.
7. Add today's entry to the log: sources checked, what was published or
   updated, what is waiting, anything that could not be reached.
8. Commit with a message listing the posts, and push to `main`.

If nothing changed, still add a one-line log entry and commit it, so a gap in
the log means the task did not run.

## Rules that do not bend

- Official sources only. Press and forums can tip you off; they are never the source.
- Never guess a number, date or rule. Leave it out and say where to check.
- No personal names beyond the two bylines, no named tools, no affiliate links.
- UK English, no em dashes, no exclamation marks.
- Never edit anything outside `content/changes` and the log, apart from fixing a
  build error your post caused.
