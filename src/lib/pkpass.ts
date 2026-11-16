import "server-only";
import { PKPass } from "passkit-generator";
import { EVENT } from "./event";
import { fromBase64, optionalEnv, siteUrl } from "./env";
import { solidPng } from "./png";
import type { Order, Ticket, TicketType } from "./types";

export function isAppleWalletConfigured(): boolean {
  return Boolean(
    optionalEnv("APPLE_PASS_TYPE_ID") &&
      optionalEnv("APPLE_TEAM_ID") &&
      optionalEnv("APPLE_WWDR_CERT_BASE64") &&
      optionalEnv("APPLE_SIGNER_CERT_BASE64") &&
      optionalEnv("APPLE_SIGNER_KEY_BASE64"),
  );
}

const WHITE: [number, number, number] = [255, 255, 255];
const BLACK: [number, number, number] = [0, 0, 0];

function images(): Record<string, Buffer> {
  const icon = (s: number) => solidPng(s, BLACK, { color: WHITE, inset: Math.round(s * 0.36) });
  const logo = (s: number) => solidPng(s, WHITE, { color: BLACK, inset: Math.round(s * 0.3) });
  return {
    "icon.png": icon(29),
    "icon@2x.png": icon(58),
    "icon@3x.png": icon(87),
    "logo.png": logo(50),
    "logo@2x.png": logo(100),
  };
}

export async function buildPkpass(order: Order, ticket: Ticket, type: TicketType | undefined): Promise<Buffer> {
  const passJson = {
    formatVersion: 1,
    passTypeIdentifier: optionalEnv("APPLE_PASS_TYPE_ID"),
    teamIdentifier: optionalEnv("APPLE_TEAM_ID"),
    organizationName: "Abiturjahrgang 2027",
    description: `${EVENT.title} – ${type?.name ?? "Ticket"}`,
    serialNumber: ticket.code,
    backgroundColor: "rgb(255,255,255)",
    foregroundColor: "rgb(0,0,0)",
    labelColor: "rgb(110,110,110)",
    logoText: EVENT.title,
    sharingProhibited: true,
    voided: ticket.status !== "valid" || order.status !== "paid",
    eventTicket: {},
  };

  const pass = new PKPass(
    {
      "pass.json": Buffer.from(JSON.stringify(passJson)),
      ...images(),
    },
    {
      wwdr: fromBase64("APPLE_WWDR_CERT_BASE64")!,
      signerCert: fromBase64("APPLE_SIGNER_CERT_BASE64")!,
      signerKey: fromBase64("APPLE_SIGNER_KEY_BASE64")!,
      signerKeyPassphrase: optionalEnv("APPLE_SIGNER_KEY_PASSPHRASE"),
    },
  );

  pass.primaryFields.push({ key: "event", label: type?.admission ?? "Einlass", value: type?.name ?? "Ticket" });
  pass.secondaryFields.push(
    { key: "name", label: "Name", value: ticket.holder_name },
    { key: "date", label: "Datum", value: "25.06.2027" },
  );
  pass.auxiliaryFields.push(
    { key: "venue", label: "Ort", value: EVENT.venueName },
    { key: "time", label: "Zeit", value: EVENT.timeLabel },
  );
  pass.backFields.push(
    { key: "address", label: "Adresse", value: `${EVENT.venueName}\n${EVENT.venueStreet}\n${EVENT.venueCity}` },
    { key: "code", label: "Ticketcode", value: ticket.code },
    { key: "order", label: "Bestellung", value: `${siteUrl()}/bestellung/${order.public_token}` },
    { key: "youth", label: "Jugendschutz", value: "Unter 18 Jahren ohne erziehungsbeauftragte Person nur bis 24 Uhr." },
    { key: "organizer", label: "Veranstalter", value: `${EVENT.organizer}. Keine Schulveranstaltung.` },
  );

  pass.setBarcodes({ message: ticket.code, format: "PKBarcodeFormatQR", messageEncoding: "iso-8859-1", altText: ticket.code });
  pass.setRelevantDate(new Date(type?.id === "afterparty" ? EVENT.afterpartyStartISO : EVENT.startISO));
  pass.setExpirationDate(new Date(new Date(EVENT.endISO).getTime() + 6 * 3600 * 1000));

  return pass.getAsBuffer();
}
