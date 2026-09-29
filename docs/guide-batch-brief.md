# Brief for guide writers (September 2026 batch)

You are writing guides for The Sellers Network, a free UK forum for online resellers. Today is 28 September 2026.

## Read first, in this order

1. `docs/guide-style.md`: voice, facts, shape, frontmatter. Mandatory.
2. One existing guide as a model of density and tone, for example `content/guides/stale-stock.mdx` or `content/guides/amazon-inventory-health.mdx`.
3. Skim the titles in `content/guides/` and `content/changes/` so you link to them instead of repeating them. Guides live at `/guides/<slug>`, change breakdowns at `/blog/<slug>`, tools at `/tools/...` (parcel size checker `/tools/postage?tab=size`, tax dates `/tools/tax`, spreadsheets `/tools/downloads`).

## Rules that do not bend

- Every fee, rate, threshold, date or rule must come from an official page (the platform's own help, fee or policy page, royalmail.com, gov.uk, asa.org.uk, legislation.gov.uk, gamblingcommission.gov.uk) and be linked inline where it is used. If you cannot confirm a figure on an official page, leave it out and tell the reader where to check. Never guess.
- Third-party blogs, forums and videos can tell you what people ask about. They are never the source of a fact, and you must not copy their structure or sentences.
- No personal names (no "Tom", no "I"). No product endorsements, named paid tools, affiliate links or referral codes. Describe the type of tool instead.
- UK English. No em dashes. No exclamation marks. No emoji. Banned words: unlock, leverage, supercharge, game changer, ultimate, secret, seamless, delve.
- Markdown only. No raw HTML tags (no `<div>`, `<br>`, `<img>`, `<script>`). Allowed components: `<Signup source="/guides/<slug>" />` (required as the last line) and, where it genuinely fits, `<PerUnitCalculator label="..." unit="..." before="0.30" after="0.40" />` or `<PercentCalculator label="..." before="5" after="9" />` with numbers in quotes.
- Links must be `https://`, a site path starting with `/`, or `#anchor`.
- Where it is general information about tax, law or money, say once that it is not tax, legal or financial advice.
- Honest and practical. Where something is a risk or a scam, say so plainly. Where the answer is "it depends", give the deciding factors and a recommendation.

## Frontmatter for guides (content/guides/<slug>.mdx)

```
---
title: "Plain title, what the reader will get"
excerpt: "One or two sentences. What the reader will be able to do."
categories: [forum-slug, forum-slug]
order: 50
published: 2026-09-28
---
```

Forum slugs you may use: ebay-listings-and-titles, ebay-pricing-and-offers, ebay-postage-and-packaging, ebay-buyers-and-disputes, ebay-account-health-and-policy, ebay-promoted-listings-and-traffic, amazon-fba-and-fbm, amazon-listings-and-content, amazon-ads-and-ppc, amazon-account-health-and-suspensions, amazon-sourcing-and-wholesale, vinted, facebook-marketplace, whatnot, ebay-live, tiktok-live-and-other, running-a-show, depop-and-clothing-resale, etsy-and-handmade, tiktok-shop, own-website-and-shopify, sourcing-and-stock, tax-bookkeeping-and-legal, tools-and-automation, multi-channel-selling, wins-and-case-studies.

## Shape

Follow `docs/guide-style.md`: a two or three sentence opening, `##` and `###` headings, tables where clearer, real recommendations, a short "what goes wrong" section, then a pointer to the right forum as a link (for example `[Vinted](/community/c/vinted)`), then the `<Signup ... />` line. 1,200 to 2,500 words each.

## Before you finish

Run `npm run guides:check -- <your-file>.mdx <other-file>.mdx` and fix every problem. Only create the files you were assigned; do not edit anything else.

Final report: the files written, and one line each for anything you could not confirm on an official page.
