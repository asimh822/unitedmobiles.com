import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

export const ADMIN_COOKIE = "um_admin";
const TOKEN_PAYLOAD = "united-mobiles-admin-v1";

function secret(): string {
  return process.env.ADMIN_PASSWORD ?? "";
}

export function makeToken(): string {
  return createHmac("sha256", secret()).update(TOKEN_PAYLOAD).digest("hex");
}

export function verifyToken(token: string | undefined): boolean {
  if (!token || !secret()) return false;
  const expected = Buffer.from(makeToken());
  const given = Buffer.from(token);
  return given.length === expected.length && timingSafeEqual(given, expected);
}

export function checkPassword(password: string): boolean {
  const s = secret();
  if (!s) return false;
  const a = Buffer.from(password);
  const b = Buffer.from(s);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function isAdminAuthenticated(): Promise<boolean> {
  const store = await cookies();
  return verifyToken(store.get(ADMIN_COOKIE)?.value);
}
