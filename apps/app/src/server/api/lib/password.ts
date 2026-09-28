import { randomInt } from "node:crypto";

// Temporary passwords sent by SMS on an admin-initiated reset. Skips
// look-alike characters (0/O, 1/l/I) since people type these from a phone.
const CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";

export function generateTemporaryPassword(length = 10): string {
  let password = "";
  for (let i = 0; i < length; i++) password += CHARS.charAt(randomInt(CHARS.length));
  return password;
}
