import "server-only";
import { timingSafeEqual } from "node:crypto";

/* The same check as /api/cron/rituals: the bearer token Vercel sends, compared in constant time. */
export function cronAuthorised(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  const given = request.headers.get("authorization") ?? "";
  if (!secret) return false;
  const a = Buffer.from(given);
  const b = Buffer.from(`Bearer ${secret}`);
  return a.length === b.length && timingSafeEqual(a, b);
}

/* Resend's default limit is a couple of requests a second, so bulk sends pause between emails. */
export const pause = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

/* Missing table before the migration is applied: 42P01 from Postgres, PGRST205 from PostgREST. */
export function isMissingTable(error: { code?: string; message?: string } | null | undefined): boolean {
  if (!error) return false;
  return error.code === "42P01" || error.code === "PGRST205" || /does not exist|could not find the table/i.test(error.message ?? "");
}
