// The password check behind proxy.ts, kept free of Next imports so node --test runs it.
// HTTP Basic auth: any username, the password must equal ACCESS_PASSWORD.
import { timingSafeEqual, createHash } from "node:crypto";

export function passwordFrom(header: string | null): string | null {
  if (!header?.startsWith("Basic ")) return null;
  const decoded = Buffer.from(header.slice(6).trim(), "base64").toString("utf8");
  const i = decoded.indexOf(":");
  return i === -1 ? null : decoded.slice(i + 1);
}

// Compare digests so the check takes the same time whatever the input length.
function same(a: string, b: string): boolean {
  const h = (s: string) => createHash("sha256").update(s).digest();
  return timingSafeEqual(h(a), h(b));
}

// true when no password is configured (open site) or the header carries the right one
export function allowed(authorization: string | null, expected: string | undefined): boolean {
  const want = expected?.trim();
  if (!want) return true;
  const given = passwordFrom(authorization);
  return given !== null && same(given, want);
}
