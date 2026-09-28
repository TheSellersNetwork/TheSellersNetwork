# Change breakdown style brief

Every fee or policy change on a marketplace, carrier or HMRC gets its own blog post at `/blog/<slug>`, written from `content/changes/<slug>.mdx`. The page explains the announcement in plain words so a seller understands it in two minutes. The official announcement is the source, linked, but the page must stand on its own: nobody should need to read the original to know what changed and what to do.

Read `docs/guide-style.md` too. Its voice and fact rules all apply here.

## Voice

- Plain UK English, short sentences, "you" for the reader, "we" for the site. Explain it the way you would to a friend who sells on the side.
- No em dashes, no exclamation marks, no emoji, no personal names, no "I".
- No product endorsements, named tools, affiliate links or referral codes.
- Do not copy the announcement's sentences. Research, then write from a blank page.
- Banned words: unlock, leverage, supercharge, game changer, ultimate, secret, seamless, delve.
- Calm, not alarmist. Say plainly when a change is good news, bad news, or mostly noise.

## Facts

- Every number (fee, rate, threshold, date) must come from an official page (the platform's own site, royalmail.com, evri.com, gov.uk) and be linked inline where it is used.
- If a figure cannot be confirmed on an official page, leave it out and say where to check. Never guess.
- If the announcement is unclear or something is not yet known, say so in "What we do not know yet".
- Say "check the current page before relying on this" where the change could move again.
- Not tax, legal or financial advice. Say so once on tax pages.

## Frontmatter (exactly these keys)

```
---
title: "Plain headline, what changed, under 80 characters"
platform: ebay            # ebay | amazon | vinted | etsy | depop | tiktok-shop | royal-mail | evri | hmrc | general
date: 2026-02-12          # when it takes or took effect. If only announced with no start date, the announcement date
announced: 2026-01-15     # optional: when it was announced, if different
status: in-effect         # in-effect | coming | announced   (announced = promised, no start date yet)
impact: high              # high | medium | low : how much it changes money or daily work for a typical small UK seller
affects: ["UK business sellers on eBay", "Orders over £10"]   # 1 to 4 short chips
summary: "One or two sentences. What changed and for whom."
source: "https://official-announcement-url"
sources:                  # other official pages you used, can be empty []
  - title: "eBay business seller fees"
    url: "https://..."
forum: deals              # forum category slug for the discussion (see list below). Use deals unless a platform forum is clearly better
guides: []                # related guide slugs from content/guides, if any genuinely fit
questions:                # 2 or 3 short, specific questions to start the forum discussion
  - "Has your per-order fee gone up on your last invoice?"
  - "Are you pricing the extra 10p into items near £10?"
---
```

Forum slugs: ebay-listings-and-titles, ebay-pricing-and-offers, ebay-postage-and-packaging, ebay-buyers-and-disputes, ebay-account-health-and-policy, amazon-fba-and-fbm, amazon-listings-and-content, amazon-account-health-and-suspensions, amazon-sourcing-and-wholesale, vinted, facebook-marketplace, depop-and-clothing-resale, etsy-and-handmade, tiktok-shop, tax-bookkeeping-and-legal, multi-channel-selling, deals.

## Body (these `##` headings, in this order; skip one only if it truly has nothing to say)

1. `## The short version` : 3 to 5 bullet points. Someone who reads only this knows what happened and whether to care.
2. `## Who it affects` : who is in and, just as useful, who is not. Private vs business sellers, UK vs Northern Ireland, categories, price bands.
3. `## What changed` : a Before | After table wherever there are numbers or rules to compare. Then a sentence or two of explanation.
4. `## What it means for your money` : a worked example with round, realistic numbers built only from the official figures (for example "on a £15 order you now pay 10p more"). Where the change is a simple per-order amount or a percentage, add one calculator (see below) so readers can plug in their own numbers.
5. `## What to do now` : a numbered checklist of concrete actions, most important first. Where to click is fine if it is on the official help page.
6. `## Key dates` : a small table of dates (announced, takes effect, deadlines).
7. `## What we do not know yet` : optional. Open questions, and what to watch for.

Do not add a closing call to action, signup, or "discuss in the forum" line: the page adds the discussion, poll and signup itself from the frontmatter.

Length: 500 to 1,200 words. Low-impact changes can be shorter.

## Calculators (optional, at most one per page, inside "What it means for your money")

Per-unit change (a fixed amount per order, item, letter):

```
<PerUnitCalculator label="Orders over £10 a month" unit="order" before="0.30" after="0.40" />
```

Percentage change (a rate on sales):

```
<PercentCalculator label="Monthly sales in this category (£)" before="11.9" after="12.5" />
```

`before` and `after` must be official figures. Use `before="0"` for a new fee. Numbers go in quotes: MDX does not run code, so `{0.30}` would arrive empty. Do not use a calculator if the change is not a simple number.
