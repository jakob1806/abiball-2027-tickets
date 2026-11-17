import "server-only";
import { createHmac } from "node:crypto";
import { isIPv6 } from "node:net";
import { NextResponse } from "next/server";
import { db } from "./supabase";
import { requireEnv } from "./env";

/**
 * Begrenzungen gegen Missbrauch (Skripte, Passwort-Raten). Zählt in der Datenbank (rate_limits),
 * weil Vercel jede Anfrage in einer anderen Instanz ausführen kann – ein Zähler im Speicher würde nicht reichen.
 *
 * Werte hier zentral anpassen. Achtung beim Verkaufsstart: Viele Schülerinnen und Schüler im selben WLAN
 * (z. B. Schule) teilen sich eine IP-Adresse.
 */
export const LIMITS = {
  /**
   * Bestellungen mit Kartenzahlung (Reservierung hält 30 Minuten). max ist nur der Ersatzwert –
   * der echte Wert steht in Admin → Einstellungen („Bestellungen pro Gerät in 15 Minuten“, settings.checkout_limit).
   */
  checkout: { max: 8, windowSeconds: 15 * 60 },
  /**
   * Bestellungen per Überweisung (Reservierung hält Tage und verschickt eine Mail) – pro IP.
   * Gezählt werden Bestellungen, nicht Tickets: eine Bestellung kann bis zu „Max. pro Bestellung“
   * (Admin → Einstellungen) Tickets enthalten. Großzügig, damit Familien mehrere Bestellungen
   * (z. B. Geschwister, Großeltern) vom selben Anschluss aufgeben können.
   */
  transferPerIp: { max: 10, windowSeconds: 24 * 3600 },
  /** … und pro E-Mail-Adresse */
  transferPerEmail: { max: 6, windowSeconds: 24 * 3600 },
  /** Fehlgeschlagene Admin-Logins */
  adminLogin: { max: 10, windowSeconds: 15 * 60 },
  /** Fehlgeschlagene Scanner-Logins (am Abend teilen sich alle Einlassgeräte das WLAN der Location) */
  scannerLogin: { max: 20, windowSeconds: 15 * 60 },
} as const;

type LimitName = keyof typeof LIMITS;

/**
 * IP-Adresse der Anfrage. Auf Vercel setzt die Plattform x-forwarded-for selbst (vom Client nicht fälschbar).
 * IPv6-Adressen werden auf das /64-Netz gekürzt, weil ein Anschluss meist ein ganzes /64 hat.
 */
export function clientIp(req: Request): string {
  const raw =
    req.headers.get("x-real-ip") ?? req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unbekannt";
  return isIPv6(raw) ? ipv6Prefix64(raw) : raw;
}

function ipv6Prefix64(ip: string): string {
  const [head, tail = ""] = ip.split("::");
  const a = head ? head.split(":") : [];
  const b = ip.includes("::") && tail ? tail.split(":") : [];
  const full = ip.includes("::") ? [...a, ...Array(8 - a.length - b.length).fill("0"), ...b] : a;
  return full.slice(0, 4).map((p) => parseInt(p || "0", 16).toString(16)).join(":") + "::/64";
}

/** Keine IPs oder E-Mails im Klartext in der Datenbank: nur ein HMAC mit geheimem Schlüssel. */
function bucket(name: LimitName, key: string): string {
  const h = createHmac("sha256", requireEnv("ADMIN_SESSION_SECRET")).update(`ratelimit:${name}:${key.toLowerCase()}`);
  return `${name}:${h.digest("base64url").slice(0, 22)}`;
}

async function call(name: LimitName, key: string, cost: 0 | 1, maxOverride?: number): Promise<boolean> {
  const { windowSeconds } = LIMITS[name];
  const max = maxOverride ?? LIMITS[name].max;
  try {
    const { data, error } = await db().rpc("rate_limit_hit", {
      p_bucket: bucket(name, key),
      p_max: max,
      p_window_seconds: windowSeconds,
      p_cost: cost,
    });
    if (error) throw error;
    return data !== false;
  } catch (err) {
    // Lieber durchlassen als den Verkauf blockieren, wenn die Begrenzung selbst ausfällt
    console.error(`Begrenzung ${name} nicht prüfbar`, err);
    return true;
  }
}

/** Zählt einen Versuch. false = Limit überschritten. */
export function hit(name: LimitName, key: string, maxOverride?: number): Promise<boolean> {
  return call(name, key, 1, maxOverride);
}

/** Bestell-Limit aus den Einstellungen (Admin); bei Fehler der Ersatzwert aus LIMITS. */
export async function checkoutLimit(): Promise<number> {
  const { data, error } = await db().from("settings").select("checkout_limit").single();
  if (error || typeof data?.checkout_limit !== "number") return LIMITS.checkout.max;
  return data.checkout_limit;
}

/** Prüft nur, ohne zu zählen (für Logins: gezählt werden nur Fehlversuche). */
export function allowed(name: LimitName, key: string): Promise<boolean> {
  return call(name, key, 0);
}

export function tooManyRequests(name: LimitName, message: string): NextResponse {
  return NextResponse.json(
    { error: message },
    { status: 429, headers: { "Retry-After": String(LIMITS[name].windowSeconds) } },
  );
}
