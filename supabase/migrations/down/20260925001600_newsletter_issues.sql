-- Reverses 20260925001600_newsletter_issues.sql
drop function if exists public.recent_members(integer, integer);
drop policy if exists newsletter_issues_staff_write on public.newsletter_issues;
drop policy if exists newsletter_issues_select on public.newsletter_issues;
drop table if exists public.newsletter_issues;
