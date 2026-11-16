import "server-only";
import { timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { db } from "./supabase";
import { isAdmin } from "./admin-auth";
import { createScannerToken, hashPassword, sign, verifyPassword } from "./scanner-crypto";
export { createScannerToken, decryptPassword, encryptPassword, generatePassword, hashPassword, verifyPassword } from "./scanner-crypto";

export const SCANNER_COOKIE = "abiball_scanner";

export interface ScannerUser {
  id: string;
  name: string;
  username: string;
  active: boolean;
  token_version: number;
  last_login_at: string | null;
  created_at: string;
}

// ---------- Tokens (für App und Web-Scanner) ----------

/** Prüft Token und lädt das Konto. Ungültig, wenn abgelaufen, deaktiviert oder Passwort zurückgesetzt. */
export async function verifyScannerToken(token: string | null | undefined): Promise<ScannerUser | null> {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 4) return null;
  const [id, ver, exp, sig] = parts;
  const expected = sign(`${id}.${ver}.${exp}`);
  if (sig.length !== expected.length || !timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  if (Number(exp) < Date.now()) return null;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const { data } = await db()
    .from("scanner_users")
    .select("id, name, username, active, token_version, last_login_at, created_at")
    .eq("id", id)
    .maybeSingle();
  const user = data as ScannerUser | null;
  if (!user || !user.active || String(user.token_version) !== ver) return null;
  return user;
}

export async function loginScanner(username: string, password: string): Promise<{ user: ScannerUser; token: string } | null> {
  const { data } = await db()
    .from("scanner_users")
    .select("id, name, username, active, token_version, last_login_at, created_at, password_hash")
    .eq("username", username.trim().toLowerCase())
    .maybeSingle();
  // Immer einen Hash berechnen, damit die Antwortzeit nichts verrät
  const ok = data ? verifyPassword(password, data.password_hash) : (verifyPassword(password, hashPassword("x")), false);
  if (!data || !ok || !data.active) return null;
  const { password_hash: _ignored, ...user } = data;
  await db().from("scanner_users").update({ last_login_at: new Date().toISOString() }).eq("id", user.id);
  return { user: user as ScannerUser, token: createScannerToken(user as ScannerUser) };
}

/**
 * Wer scannt? Reihenfolge: Bearer-Token (App), Scanner-Cookie (Web), Admin-Sitzung.
 * Gibt null zurück, wenn niemand angemeldet ist.
 */
export async function currentScanner(req: Request): Promise<{ id: string | null; label: string } | null> {
  const auth = req.headers.get("authorization");
  const bearer = auth?.startsWith("Bearer ") ? auth.slice(7) : null;
  const user = await verifyScannerToken(bearer ?? cookies().get(SCANNER_COOKIE)?.value);
  if (user) return { id: user.id, label: user.name };
  if (await isAdmin()) return { id: null, label: "Admin" };
  return null;
}
