// Shared brute-force lockout logic for both student PIN login (only 10,000
// possible 4-digit PINs — the single most important security control in
// this system) and admin password login (same mechanism, for consistency).

const BASE_THRESHOLD = 5; // consecutive failures before the first lockout
const BASE_LOCKOUT_MINUTES = 15;
const MAX_LOCKOUT_MINUTES = 24 * 60;

// Escalates without a separate "lockout count" column: once past the base
// threshold, every additional BASE_THRESHOLD failures doubles the lockout
// duration, capped at 24h.
export function computeLockoutUntil(failedAttemptsAfterThisOne: number): Date | null {
  if (failedAttemptsAfterThisOne < BASE_THRESHOLD) return null;
  const escalations = Math.floor((failedAttemptsAfterThisOne - BASE_THRESHOLD) / BASE_THRESHOLD);
  const minutes = Math.min(BASE_LOCKOUT_MINUTES * 2 ** escalations, MAX_LOCKOUT_MINUTES);
  return new Date(Date.now() + minutes * 60_000);
}

export function isLockedOut(lockedUntil: string | Date | null): boolean {
  if (!lockedUntil) return false;
  return new Date(lockedUntil).getTime() > Date.now();
}

export function formatLockedUntil(lockedUntil: string | Date): string {
  return new Date(lockedUntil).toLocaleString("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

// A fixed, precomputed bcrypt hash of a value nobody will ever submit as a
// real PIN/password. Comparing against this when a lookup finds no matching
// row keeps failed-login response timing indistinguishable from a genuine
// wrong-credential case, so the endpoint can't be used to enumerate valid
// registration numbers / institutional emails via timing.
export const DUMMY_BCRYPT_HASH =
  "$2b$12$CwTycUXWue0Thq9StjUM0uJ8k5NuQlKY9x9lLElqOb3ROn9E0mCcW";
