// Passwort-Hashing, Verschlüsselung und Token-Signatur für Scanner-Konten (ohne Next.js-Abhängigkeiten).
import { createCipheriv, createDecipheriv, createHmac, randomBytes, randomInt, scryptSync, timingSafeEqual } from "node:crypto";
import { requireEnv } from "./env";

const TOKEN_DAYS = 30;

// ---------- Passwörter ----------

/** Lesbares Passwort ohne verwechselbare Zeichen, z. B. „kafe-7m3q-tuxa“. */
export function generatePassword(): string {
  const a = "abcdefghjkmnpqrstuvwxyz23456789";
  const part = () => Array.from({ length: 4 }, () => a[randomInt(a.length)]).join("");
  return `${part()}-${part()}-${part()}`;
}

export function hashPassword(pw: string): string {
  const salt = randomBytes(16);
  const hash = scryptSync(pw, salt, 32);
  return `scrypt$${salt.toString("base64")}$${hash.toString("base64")}`;
}

export function verifyPassword(pw: string, stored: string): boolean {
  const [scheme, saltB64, hashB64] = stored.split("$");
  if (scheme !== "scrypt" || !saltB64 || !hashB64) return false;
  const expected = Buffer.from(hashB64, "base64");
  const actual = scryptSync(pw, Buffer.from(saltB64, "base64"), expected.length);
  return timingSafeEqual(actual, expected);
}

function encKey(): Buffer {
  const key = Buffer.from(requireEnv("SCANNER_PASSWORD_KEY"), "base64");
  if (key.length !== 32) throw new Error("SCANNER_PASSWORD_KEY muss 32 Byte (base64) lang sein");
  return key;
}

/** Verschlüsselt das Passwort, damit Admins es später wieder anzeigen können (AES-256-GCM). */
export function encryptPassword(pw: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encKey(), iv);
  const data = Buffer.concat([cipher.update(pw, "utf8"), cipher.final()]);
  return [iv, cipher.getAuthTag(), data].map((b) => b.toString("base64")).join(".");
}

export function decryptPassword(enc: string): string {
  const [iv, tag, data] = enc.split(".").map((p) => Buffer.from(p, "base64"));
  const decipher = createDecipheriv("aes-256-gcm", encKey(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8");
}

export function sign(payload: string): string {
  return createHmac("sha256", requireEnv("ADMIN_SESSION_SECRET")).update(`scanner:${payload}`).digest("base64url");
}

export function createScannerToken(user: { id: string; token_version: number }): string {
  const exp = Date.now() + TOKEN_DAYS * 86400000;
  const payload = `${user.id}.${user.token_version}.${exp}`;
  return `${payload}.${sign(payload)}`;
}

