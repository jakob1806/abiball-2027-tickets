import "server-only";
import { SignJWT, importPKCS8 } from "jose";
import { EVENT } from "./event";
import { optionalEnv, siteUrl } from "./env";
import type { Order, Ticket, TicketType } from "./types";

interface ServiceAccount {
  client_email: string;
  private_key: string;
}

function serviceAccount(): ServiceAccount | null {
  const raw = optionalEnv("GOOGLE_WALLET_SERVICE_ACCOUNT_BASE64");
  if (!raw) return null;
  try {
    return JSON.parse(Buffer.from(raw, "base64").toString("utf8")) as ServiceAccount;
  } catch {
    return null;
  }
}

export function isGoogleWalletConfigured(): boolean {
  return Boolean(optionalEnv("GOOGLE_WALLET_ISSUER_ID") && serviceAccount());
}

const de = (value: string) => ({ defaultValue: { language: "de-DE", value } });

/** Erzeugt einen „Zu Google Wallet hinzufügen“-Link (signierter JWT) für die gültigen Tickets. */
export async function googleWalletUrl(
  order: Order,
  tickets: Ticket[],
  types: Record<string, TicketType>,
): Promise<string | null> {
  const issuerId = optionalEnv("GOOGLE_WALLET_ISSUER_ID");
  const sa = serviceAccount();
  const valid = tickets.filter((t) => t.status === "valid");
  if (!issuerId || !sa || order.status !== "paid" || valid.length === 0) return null;

  const classSuffix = optionalEnv("GOOGLE_WALLET_CLASS_SUFFIX") ?? "abiball2027";
  const classId = `${issuerId}.${classSuffix}`;

  const ticketClass = {
    id: classId,
    issuerName: "Abiturjahrgang 2027",
    reviewStatus: "UNDER_REVIEW",
    eventName: de(EVENT.title),
    venue: { name: de(EVENT.venueName), address: de(`${EVENT.venueStreet}, ${EVENT.venueCity}`) },
    dateTime: { start: EVENT.startISO, end: EVENT.endISO },
    hexBackgroundColor: "#000000",
    homepageUri: { uri: siteUrl(), description: "Abiball 2027" },
  };

  const objects = valid.map((t) => ({
    id: `${issuerId}.${t.code.replace(/[^A-Za-z0-9_.-]/g, "_")}`,
    classId,
    state: "ACTIVE",
    ticketHolderName: t.holder_name,
    ticketNumber: t.ticket_number ?? t.code,
    hexBackgroundColor: t.ticket_type_id === "ball" ? "#000000" : "#5a5a5a",
    ticketType: de(types[t.ticket_type_id]?.name ?? "Ticket"),
    barcode: { type: "QR_CODE", value: t.code, alternateText: t.code },
    linksModuleData: {
      uris: [{ uri: `${siteUrl()}/ticket/${t.code}`, description: "Ticket online ansehen" }],
    },
  }));

  const key = await importPKCS8(sa.private_key, "RS256");
  const origin = new URL(siteUrl()).origin;
  const jwt = await new SignJWT({
    typ: "savetowallet",
    origins: [origin],
    payload: { eventTicketClasses: [ticketClass], eventTicketObjects: objects },
  })
    .setProtectedHeader({ alg: "RS256", typ: "JWT" })
    .setIssuer(sa.client_email)
    .setAudience("google")
    .setIssuedAt()
    .sign(key);

  return `https://pay.google.com/gp/v/save/${jwt}`;
}
