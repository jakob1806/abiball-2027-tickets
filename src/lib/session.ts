// Signiertes Admin-Cookie (HMAC-SHA256). Funktioniert in Edge (Middleware) und Node.

export const ADMIN_COOKIE = "abiball_admin";
export const SESSION_HOURS = 12;

const enc = new TextEncoder();

function toHex(buf: ArrayBuffer): string {
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function hmac(secret: string, data: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return toHex(await crypto.subtle.sign("HMAC", key, enc.encode(data)));
}

function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function secret(): string | undefined {
  const s = process.env.ADMIN_SESSION_SECRET;
  return s && s.length >= 32 ? s : undefined;
}

export async function createSessionToken(): Promise<string> {
  const s = secret();
  if (!s) throw new Error("ADMIN_SESSION_SECRET fehlt oder ist kürzer als 32 Zeichen");
  const exp = Date.now() + SESSION_HOURS * 3600 * 1000;
  const payload = `admin.${exp}`;
  return `${payload}.${await hmac(s, payload)}`;
}

export async function verifySessionToken(token: string | undefined): Promise<boolean> {
  const s = secret();
  if (!s || !token) return false;
  const parts = token.split(".");
  if (parts.length !== 3) return false;
  const [role, exp, sig] = parts;
  if (role !== "admin" || !/^\d+$/.test(exp) || Number(exp) < Date.now()) return false;
  return constantTimeEqual(sig, await hmac(s, `${role}.${exp}`));
}

/** Vergleicht das eingegebene Passwort zeitkonstant über HMAC-Digests. */
export async function checkPassword(input: string): Promise<boolean> {
  const expected = process.env.ADMIN_PASSWORD;
  const s = secret();
  if (!expected || !s) return false;
  const [a, b] = await Promise.all([hmac(s, input), hmac(s, expected)]);
  return constantTimeEqual(a, b);
}
