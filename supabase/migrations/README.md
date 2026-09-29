# Migrations

Plain SQL, applied in filename order by the Supabase CLI (`supabase db push`) or the
dashboard. Every file has a matching reverse script in `down/` with the same name.

## Rules

- One concern per file. Never edit a migration that has been applied; add a new one.
- Every table has row-level security. Policies live in `20260925000800_permissions_rls.sql`
  for the launch schema; later tables carry their own policies in the same file that creates
  them.
- Every migration is reversible. Write the `down/` script at the same time and keep the order
  of drops the reverse of the creates.
- Security: every new migration must assume a member can call the REST API directly with
  their own session. Server-owned columns need protecting on insert as well as update.
  Functions that must stay server-only (`check_rate_limit`, `recompute_trust_levels`,
  `refresh_topic_counters`, `record_placement_event`, `user_can_see_category`) are revoked
  in `20260928001900`; if a later migration ends with `grant execute on all functions`,
  repeat those revokes after it. See `docs/security-and-compliance.md`.
- No seed data here. Seeding is a script (task: seed script) that reads Tom's CSV.

## Testing without a database

`npm run test:db` runs every up migration in PGlite (Postgres in WebAssembly), exercises the
triggers and policies, then runs every down migration and checks the schema is empty. It runs
in CI. The harness stubs the `auth` schema and the three Supabase roles.

## Order

| File | Contents |
| --- | --- |
| 0100_helpers | `set_updated_at`, `prevent_change`, `slugify`, `generate_short_id` |
| 0200_profiles_groups | `profiles`, `groups`, `group_members`, `is_staff()`, `current_trust_level()` |
| 0300_categories_tags | `categories` (one level), `tags`, `category_visible()` |
| 0400_topics_posts | `topics`, `posts`, search vectors, numbering, counters, duplicate rejection |
| 0500_engagement | `likes`, `bookmarks`, `topic_subscriptions`, `flags` (auto-hide), `post_revisions`, `topic_tags` |
| 0600_notifications_badges_moderation | `notifications`, `badges`, `user_badges`, `moderation_log` (immutable), `user_stats_daily` |
| 0700_blog_email | `blog_posts`, `email_subscribers`, `email_sequence_steps`, `email_sends` |
| 0800_permissions_rls | `can_post()`, `can_reply()`, column-protection triggers, every policy |
| 20260928002300_house_account | `site_accounts` key allows `house` (The Sellers Network account) |
| 20260930000100_member_forum_email | `tag_follows`, `member_email_prefs` (opt-in digest and fee alerts), send logs, `tag_topic` notifications |
| 20260930000200_pickup_talk_milestones_welcome | `pickup_comments`, `pickup_votes` with counters, `profile_milestones`, `profiles.welcome_dismissed_at` |
| 20260930000300_saved_calculations | `saved_calculations` (own rows only, 200 per member) |
