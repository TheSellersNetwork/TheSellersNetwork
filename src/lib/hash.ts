import "server-only";
import { createHash } from "node:crypto";

/*
  Salted hashes for anything we must not store in the clear (analytics ids,
  rate-limit keys built from emails, sponsor viewer hashes). Without a real
  secret salt a hash of an email can be reversed by guessing, so production
  refuses to run without PLACEMENT_HASH_SALT.
*/
export function hashSalt(): string | null {
  const salt = process.env.PLACEMENT_HASH_SALT;
  if (salt && salt.length >= 16) return salt;
  return process.env.NODE_ENV === "production" ? null : "development-only-salt";
}

/* Returns null when no salt is configured in production, so callers can skip rather than store something reversible. */
export function saltedHash(value: string, length = 32): string | null {
  const salt = hashSalt();
  if (!salt) return null;
  return createHash("sha256").update(`${salt}:${value}`).digest("hex").slice(0, length);
}
