# The Sellers Network: Build Brief

You are building The Sellers Network, a professional community forum and blog for UK resellers of every kind, together with the mentoring site it sits inside. eBay and Amazon are the two biggest marketplaces and get the most category depth, but the community is for anyone who buys and sells for profit: Vinted, Etsy, Depop, Facebook Marketplace, Shopify and own-website sellers, car boot and auction sourcing, wholesale and retail arbitrage. Copy, categories and onboarding must never read as eBay-only or Amazon-only. Read this whole file before writing any code. Everything discussed with Tom is here; if something is not covered, ask him rather than guessing.

## How to work

- Work in this repo. One task per pull request, in the order listed under "Build order".
- Before each task: state what you will build and any decision you need from Tom. Then build it, run the tests, deploy a Vercel preview, and stop for review.
- Every migration is reversible. Every table has row-level security. Never expose the Supabase service key to the client.
- UK English everywhere, in code comments, copy, error messages and emails. No em dashes anywhere. No exclamation marks in user-facing copy.
- Tom is the product owner and writes all content. Use clearly marked placeholders such as [TOM: category intro] where copy is needed; never invent seller advice, numbers or testimonials.
- Never generate fake members, fake posts or AI-written seed content presented as real. Seed data comes from a CSV Tom supplies.
- Environment variables live in .env.local (never committed). Ask Tom for values you do not have.

## Stack

| Layer | Choice |
| --- | --- |
| Framework | Next.js (App Router, TypeScript) on Vercel |
| Database, auth, storage, cron | Supabase |
| UI | Tailwind, shadcn/ui, one design tokens file |
| Content | MDX in the repo for guides, blog posts and course modules |
| Editor | Tiptap, storing Markdown |
| Rendering | Server-side Markdown to sanitised HTML, cached in the database |
| Search | Postgres full-text search (tsvector) |
| Email | Resend with React Email templates |
| Payments | Stripe (course one-off, mentoring subscriptions) |
| Bookings | Cal.com embed |
| Video | Mux or Bunny Stream (Phase 2 of the mentoring site) |
| Analytics | PostHog |
| Anti-abuse | Cloudflare Turnstile, Postgres rate limits, Akismet on new-user posts |
| Tests | Playwright for flows, Vitest for units, Lighthouse CI |

## Site map

```
/                       Landing: who Tom is, results, three paths (learn, get mentored, go Autopilot), email capture
/guides                 Free SEO articles, one per common seller problem
/guides/[slug]
/blog                   The Sellers Network blog, card grid, filter by eBay / Amazon / Both
/blog/[slug]            Post with linked forum discussion thread
/community              The Sellers Network forum: category list
/community/c/[slug]     Category topic list
/community/t/[slug]/[id] Topic page
/community/new          Composer
/community/u/[username] Profile
/community/rules        House rules
/community/search
/course                 Sales page for the self-paced course
/course/[module]        Gated content for buyers
/mentoring              Group and one-to-one, pricing, booking
/autopilot              Explainer and waitlist
/about
/account                Purchases, bookings, notification settings
/admin/flags            Staff moderation queue
/admin                  Dashboard (Phase C)
```

## Part 1: The Sellers Network forum

### Purpose and positioning

A free, public, search-indexed forum and blog. The serious UK resellers' community, whatever platform they sell on: not a Facebook group, not a Discord. Consistent identities, real numbers, moderated answers, no selling in threads. It is the top of the funnel: blog posts and solved questions bring people in from search, the free email course captures them, the paid course, mentoring and Autopilot are the offers. It must look like a well-funded trade publication, not a hobby board.

### Data model (Supabase, RLS on every table, UUID ids, timestamptz)

| Table | Key columns | Notes |
| --- | --- | --- |
| profiles | id (= auth.users.id), username, display_name, avatar_url, bio, marketplaces (array: ebay, amazon, vinted, etsy, depop, facebook, own_website, other), trust_level 0 to 4, post_count, likes_received, days_visited, last_seen_at, is_staff, is_suspended, suspended_until | Created by trigger on signup |
| categories | id, slug, name, description, colour, icon, position, parent_id, min_trust_to_post, is_private, allowed_group_id | One level of subcategories |
| topics | id, slug, title, category_id, author_id, is_pinned, is_locked, is_solved, solution_post_id, view_count, reply_count, like_count, last_post_at, last_poster_id, search_vector | URL is /community/t/[slug]/[short id] so renames do not break links |
| posts | id, topic_id, author_id, body_md, body_html, reply_to_post_id, post_number, like_count, is_deleted, deleted_by, edited_at, edit_count, search_vector | body_html rendered and sanitised server-side |
| post_revisions | id, post_id, editor_id, body_md, created_at | Edit history for staff and TL3+ |
| likes | user_id, post_id, created_at | Unique (user_id, post_id) |
| flags | id, post_id, reporter_id, reason, note, status (open, agreed, disagreed, ignored), resolved_by, resolved_at | Drives the staff queue |
| bookmarks | user_id, post_id, note | |
| topic_subscriptions | user_id, topic_id, level (watching, tracking, muted) | Reply notifications |
| tags, topic_tags | id, slug, name / topic_id, tag_id | e.g. royal-mail, fba, vero |
| notifications | id, user_id, type, payload jsonb, read_at | Bell and email both read from here |
| badges, user_badges | id, slug, name, description, icon, criteria_sql / user_id, badge_id, granted_at | Nightly cron |
| groups, group_members | id, slug, name, is_paid / group_id, user_id | Gates private categories |
| moderation_log | id, actor_id, action, target_type, target_id, reason, created_at | Immutable |
| user_stats_daily | user_id, day, topics_read, posts_read, time_read_secs, likes_given | Feeds trust levels |
| blog_posts | slug, title, excerpt, author_id, published_at, category, related_topic_ids | Body is MDX in repo |
| email_subscribers, email_sequence_steps, email_sends | | For the 7-day course |

RLS: anyone reads public categories; authenticated users insert posts subject to trust caps enforced in a can_post() Postgres function; authors update own posts; staff bypass via is_staff(); private categories check group membership.

### Trust levels (nightly Supabase cron)

| Level | Earned by | Can do |
| --- | --- | --- |
| TL0 New | Signing up | Read all, 3 topics and 10 replies per day, 1 image, no links, max 2 mentions, Akismet-checked |
| TL1 Basic | Read 5 topics, 30 posts, 10 minutes on site | Links, 5 images, flag, edit own posts 24h, private messages |
| TL2 Member | 15 days visited, 20 likes received, 1 like given, 3 replies | Edit own posts indefinitely, invite, no daily caps, galleries |
| TL3 Regular | 50 of last 100 days visited, 25% of new topics read, 20 likes received, no suspensions, 1 flag agreed | Recategorise, rename, mark solutions on others' threads, hide spam with one flag, see edit history. Demoted after 100 days inactive |
| TL4 Leader | Staff granted | Pin, lock, unlist, split, merge, edit others' posts, flag queue |

Staff sit above TL4. Every staff and TL4 action writes to moderation_log.

### Categories at launch (seed script)

Decided 25 September 2026: four top-level platforms at launch, then an Other platforms section.

eBay: Listings and titles; Pricing and offers; Postage and packaging; Buyers and disputes; Account health and policy; Promoted Listings and traffic. Amazon: FBA and FBM; Listings and content; Ads and PPC; Account health and suspensions; Sourcing and wholesale. Vinted: [TOM: subcategories, or a single category to start]. Facebook Marketplace: [TOM: subcategories, or a single category to start]. Other platforms: Depop and clothing resale; Etsy and handmade; Own website and Shopify. Reselling in general: Sourcing and stock (car boots, charity shops, auctions, wholesale, liquidation); Tax, bookkeeping and legal; Tools and automation; Multi-channel selling; Wins and case studies; Introductions; Site feedback. Hidden: Inner Circle (private, for the paid mentoring group, Phase C).

Each category gets a one-line description, a colour, and a pinned "Read this first" topic with a [TOM: ...] placeholder.

### Design system and professional standard

- Typography: Inter for UI and body; a serif (Source Serif) for blog headlines only. 16px body, 1.6 line height, 680px max reading width.
- Colour: white and near-black, one accent (deep teal by default, Tom may change it), category colours as 4px bars only. Full dark mode from day one. No gradients, no stock photos, no emoji reactions.
- Layout: three-column on desktop (categories, topic list, right rail), single column on mobile. Sticky header with search, New topic button, notification bell, avatar.
- shadcn components throughout. Avatars are initials on neutral colour until uploaded.
- Topic list rows: title, category bar, tags, reply count, last activity, up to three avatars. No excerpts.
- Display name plus @username. Solved answers pinned at the top of the thread with a green tick. Edits after 5 minutes show "edited" with timestamp.
- Onboarding: pick the platforms you sell on (multi-select, any number), accept house rules, introduce yourself.
- Empty states use [TOM: ...] placeholders, never "No posts yet".
- Performance: thread page interactive under 1.5s on 4G, Lighthouse 90+ on every page type, checked in CI.
- Accessibility: WCAG 2.1 AA contrast, full keyboard navigation, visible focus rings.
- Tone guide for all copy and emails: plain, calm, UK English, no exclamation marks.

### Blog

- /blog card grid, newest first, filter by platform (eBay, Amazon, Vinted, Etsy, Other, All).
- /blog/[slug]: headline, standfirst, author card (Tom), reading time, table of contents, body, "Discuss this on the forum" button, email course signup.
- MDX frontmatter: title, excerpt, platforms (array), category, related_topic_ids, cover, published date.
- On publish, automatically create the discussion thread in the matching forum category and store its id. Comments live on the forum only.
- Content types Tom will write: evergreen guides, real-numbers case studies, weekly forum roundup (Friday), news reactions, monthly member spotlight. Build a template for the roundup that pulls the week's top solved threads and credits their authors.

### Moderation and safety

Automatic: Turnstile on signup; email verification before first post; TL0 caps; duplicate body within 10 minutes rejected; auto-hide at 3 flags from TL1+ or 1 from TL3+, with email to author; word filter for account-selling and feedback-manipulation terms routing to the queue; accounts under 24 hours cannot post in Wins and case studies or Sourcing.

Human: /admin/flags queue with agree (hide and warn), disagree (restore), ignore. Suspension ladder: warning, 3-day silence, 30-day suspension, permanent, each with a reason the user can read.

House rules page at /community/rules, shown during onboarding:

1. Be useful. Answer with what you actually did and what happened.
2. No selling, no links to your listings, no account trading, no feedback swaps.
3. No advice on evading marketplace policy, VeRO, tax or the law.
4. Real numbers welcome, screenshots welcome, competitor bashing not.
5. One account per person. Business accounts are fine if disclosed.
6. Staff decisions can be appealed once, by private message, and are final after that.

GDPR: privacy policy, cookie consent for PostHog, account self-deletion that anonymises posts, data export on request.

### SEO and funnel

- Server-rendered topics and posts with canonical URLs, title from topic, meta description from first post.
- Structured data: QAPage with acceptedAnswer for solved topics, DiscussionForumPosting otherwise, Article for blog, BreadcrumbList everywhere.
- Sitemaps split by type, regenerated hourly. noindex on profiles, thin tag pages (under 5 topics) and anything hidden pending review.
- Internal links: matching guide in the right rail of every topic; every blog post links its thread.
- Funnel touchpoints: email course signup in the right rail of every thread, under every solved answer, and at the end of every blog post. Members past TL2 see a soft mentoring banner on their profile. Tools and automation has a pinned "when to automate" topic linking the Autopilot waitlist.
- Staff dashboard lists unanswered topics older than 48 hours.
- PostHog events: signup, first post, solution marked, signup form submitted (with source page).

### Forum features by phase

- Phase A (weeks 1 to 3): categories, topics, replies, quoting, mentions; Tiptap composer with preview and image paste; likes; solved; pin and lock; flags and staff queue; profiles; search; latest, top, unanswered views; reply and mention emails; TL0 to TL2; onboarding; house rules; sitemap, OG, schema; signup touchpoints; dark mode; blog with auto-created threads.
- Phase B (weeks 4 to 6): tags; bookmarks; notification bell; badges (first post, first solution, 10 solutions, 100 likes, one year, founding member); TL3 and TL4; weekly digest email; suggested topics; private messages; suspension and silence; shadow-ban; edit history; Akismet on TL0; roundup template; member spotlight template.
- Phase C (weeks 7 to 10): Inner Circle gated to the £59 group via Stripe webhook; Realtime new-reply indicator; reply by email; admin dashboard; Ask Tom category linking to Cal.com; Autopilot banner past TL2; shared login with the Autopilot app.
- Deferred deliberately: polls, chat, video embeds, reactions beyond a single like.

## Part 2: The mentoring site around the forum

### Products and pricing (starting point, Tom may change)

| Product | Price | Includes |
| --- | --- | --- |
| Email course | Free | 7 daily emails, one fix per day |
| Self-paced course | £149 one-off | 8 modules, templates, prompt pack, 3 months Inner Circle |
| Group mentoring | £59 per month | Fortnightly live calls, Inner Circle, monthly listing review |
| One-to-one | £150 per hour; £450 shop audit | Call, written audit, 30-day follow-up |
| Done-with-you setup | £750 | Shop and rules set up, then handover or move to Autopilot |

Autopilot clients get the course free.

### Mentoring site phases

- Phase 1 (weeks 1 to 3): scaffold, landing, about, first 10 guides, email course sequence, Autopilot waitlist. Done at 100 on the list.
- Phase 2 (weeks 4 to 8): 8 course modules, Stripe checkout, gated course area, progress tracking, downloads. Done at 10 buyers.
- Phase 3 (weeks 9 to 12): Cal.com booking, Stripe subscriptions, live call schedule, audit template. Done at 10 group members.
- Phase 4: Autopilot page becomes live signup, offers to completers and members, shared login.

### First 20 guides (outlines only, Tom fills with real examples and numbers)

Titles, specifics and Cassini; pricing from sold comps; Best Offer strategy; watcher offers; photos on a phone; descriptions that sell; postage and Royal Mail choices; packaging cheaply; handling "is this still available"; handling haggles; returns without losing money; INR and cases; feedback requests; avoiding VeRO and suspensions; stale stock; relisting; Promoted Listings; sourcing for resale; bookkeeping and tax; when to automate. Each ends with the email course signup and a soft link to the relevant course module.

## Build order

Forum first, because it must be live and gathering members before the paid tiers exist.

### Week 1 (forum foundations)

- [x] Scaffold Next.js, TypeScript, Tailwind, shadcn, MDX, Supabase client, PostHog. Deploy to Vercel. CI with lint, tests and Lighthouse.
- [x] Migrations for every forum table, RLS policies, is_staff() and can_post(), tsvector columns and triggers.
- [x] Profile trigger on signup, username picker, multi-select platform choice, onboarding with house rules acceptance.
- [x] Design tokens, shared header, right rail, footer, dark mode.
- [x] /community category list.
- [x] Topic list views (latest, top by day/week/month, unanswered), per-category, cursor pagination.
- [x] Topic page with posts, quotes, solved pinned, like, flag, share, right-rail guide and signup.
- [x] Composer: Tiptap, Markdown storage, preview, image paste to Supabase Storage with resize, mention autocomplete, draft autosave.
- [x] Server-side Markdown render and sanitise, cached in posts.body_html.
- [x] /admin/flags queue and moderation_log.
- [x] Trust level cron, TL0 caps, user_stats_daily.
- [x] Resend templates for reply and mention; notification preferences.
- [x] /blog and /blog/[slug] on MDX; publish hook creates the discussion thread.
- [x] Sitemaps, canonicals, OG images, QAPage and Article schema.
- [x] Turnstile, rate limiting, duplicate rejection.
- [x] PostHog events.
- [x] Seed script: all launch categories, pinned intro placeholders, CSV loader for Tom's seed topics.

Definition of done: Tom can register, post a topic with an image, receive a reply notification, mark it solved, and see it in the latest list on a preview deploy with Lighthouse over 90.

### Week 2 to 3

Finish Phase A, then: landing page with three paths and email capture (done, free forum framing); /guides on MDX with table of contents and signup footer (done: all twenty guides plus the Amazon FBA manual written 25 September 2026, style in docs/guide-style.md); email sequence tables and Resend jobs for the 7-day course; /autopilot waitlist; /about; outlines for the first 10 guides as MDX files with [TOM: ...] placeholders.

### Weeks 4 onward

Forum Phase B, then mentoring Phase 2 (Stripe, gated course, video), then forum Phase C and mentoring Phase 3 together.

## Decisions to ask Tom about as you reach them

- Domain (thesellersnetwork.co.uk or .com) and email sending domain
- Which extra platforms deserve their own category at launch versus living under Other platforms
- Which platform categories are live at launch. Decided 25 September 2026: eBay, Amazon, Vinted and Facebook Marketplace as top-level platforms from day one, plus Other platforms for Depop, Etsy and own website.
- Real names encouraged or usernames only. Decided 25 September 2026: member's choice. Username is required (mentions and profile URL), display name is optional free text so it can be a real name, a shop name or left as the username.
- Accent colour and logo. Decided 25 September 2026: slate and electric blue, warm style, nodes mark. Alternatives remain at /brand for staff.
- Community platform for live calls (Zoom or Google Meet link is fine to start)
- Any change to the pricing table before Stripe products are created

## Additions agreed on 25 September 2026 (outside the original brief)

- Partners directory at /partners with sponsored and affiliate labels; sponsor placements in the right rail and after the fifth topic row, managed at /admin/partners, with impressions and clicks in the database and PostHog.
- Weekly numbers thread posted every Monday from content/templates/weekly-numbers.md.
- Similar solved topics shown while typing a title; search results list solved threads first.
- Solution counts next to member names; top answerers card in the right rail.
- Category follow and mute, with a Following feed seeded from the marketplaces picked at onboarding.
- Ask Tom category with a monthly window opened and closed at /admin; staff answers are auto-tagged and `npm run ask-tom:digest` drafts the blog post.
- Screenshot hint and redaction reminder in the composer.
- Search-landing funnel events for signed-out visitors, carried through to signup events.
- Blog templates for evergreen guide, case study, news reaction and member spotlight.
