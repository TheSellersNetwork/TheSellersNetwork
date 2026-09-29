import { formatDistanceToNowStrict, format, differenceInMinutes } from "date-fns";
import { enGB } from "date-fns/locale";
import type { ProfileSummary } from "@/lib/db/types";

/* "3m", "2h", "5d", then a date once it is over a month old. */
export function timeAgo(iso: string): string {
  const date = new Date(iso);
  const minutes = differenceInMinutes(new Date(), date);
  if (minutes < 1) return "now";
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 31) return `${days}d`;
  return format(date, "d MMM yyyy", { locale: enGB });
}

export function longDate(iso: string): string {
  return format(new Date(iso), "d MMMM yyyy 'at' HH:mm", { locale: enGB });
}

export function relative(iso: string): string {
  return formatDistanceToNowStrict(new Date(iso), { addSuffix: true, locale: enGB });
}

export function displayName(p: Pick<ProfileSummary, "display_name" | "username"> | null): string {
  if (!p) return "Deleted member";
  return p.display_name?.trim() || p.username;
}

export function initials(p: Pick<ProfileSummary, "display_name" | "username"> | null): string {
  const name = displayName(p);
  const parts = name.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

export const trustLabels = ["New", "Basic", "Member", "Regular", "Leader"] as const;

/* Staff, including the house account, are shown as Team. */
export function trustLabel(level: number, isStaff: boolean): string {
  if (isStaff) return "Team";
  return trustLabels[level] ?? "Member";
}

/* Joined on or before siteConfig.foundingUntil. Staff are left out: they are Team. */
export function isFoundingMember(p: { created_at?: string | null; is_staff?: boolean } | null | undefined, foundingUntil: string): boolean {
  if (!p?.created_at || p.is_staff) return false;
  return p.created_at.slice(0, 10) <= foundingUntil;
}

export function plural(n: number, one: string, many = `${one}s`): string {
  return `${n} ${n === 1 ? one : many}`;
}

export function readingTime(text: string): number {
  const words = text.trim().split(/\s+/).length;
  return Math.max(1, Math.round(words / 220));
}
