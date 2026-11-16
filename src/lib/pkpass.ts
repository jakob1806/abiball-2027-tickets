import "server-only";
import { PKPass } from "passkit-generator";
import { EVENT } from "./event";
import { fromBase64, optionalEnv, siteUrl } from "./env";
import { WALLET_ASSETS_BASE64 } from "./wallet-assets";
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

function images(): Record<string, Buffer> {
  return Object.fromEntries(Object.entries(WALLET_ASSETS_BASE64).map(([k, v]) => [k, Buffer.from(v, "base64")]));
}

export async function buildPkpass(order: Order, ticket: Ticket, type: TicketType | undefined): Promise<Buffer> {
  const isBall = ticket.ticket_type_id === "ball";
  // Ball = weißer Pass, Afterparty = schwarzer Pass → am Einlass sofort unterscheidbar
  const colors = isBall
    ? { backgroundColor: "rgb(255,255,255)", foregroundColor: "rgb(0,0,0)", labelColor: "rgb(110,110,110)" }
    : { backgroundColor: "rgb(0,0,0)", foregroundColor: "rgb(255,255,255)", labelColor: "rgb(175,175,175)" };

  const passJson = {
    formatVersion: 1,
    passTypeIdentifier: optionalEnv("APPLE_PASS_TYPE_ID"),
    teamIdentifier: optionalEnv("APPLE_TEAM_ID"),
    organizationName: "Abiturjahrgang 2027 · Wittelsbacher-Gymnasium München",
    description: `${EVENT.title} – ${type?.name ?? "Ticket"} ${ticket.ticket_number ?? ""}`.trim(),
    serialNumber: ticket.code,
    ...colors,
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

  pass.headerFields.push({ key: "nr", label: "Ticket-Nr.", value: ticket.ticket_number ?? "–", textAlignment: "PKTextAlignmentRight" });
  pass.primaryFields.push({
    key: "event",
    label: isBall ? "Einlass ab 19:00 Uhr" : "Einlass ab 22:30 Uhr",
    value: isBall ? "BALL" : "AFTERPARTY",
  });
  pass.secondaryFields.push(
    { key: "name", label: "Name", value: ticket.holder_name },
    { key: "date", label: "Datum", value: "Fr, 25.06.2027", textAlignment: "PKTextAlignmentRight" },
  );
  pass.auxiliaryFields.push(
    { key: "venue", label: "Ort", value: EVENT.venueName },
    { key: "incl", label: "Enthalten", value: isBall ? "Buffet · Programm · Afterparty" : "Afterparty", textAlignment: "PKTextAlignmentRight" },
  );
  pass.backFields.push(
    { key: "address", label: "Adresse", value: `${EVENT.venueName}\n${EVENT.venueStreet}\n${EVENT.venueCity}` },
    { key: "ticket", label: "Ticket", value: `${type?.name ?? ticket.ticket_type_id} · Nr. ${ticket.ticket_number ?? "–"}` },
    { key: "code", label: "Ticketcode", value: ticket.code },
    { key: "school", label: "Schule", value: `${EVENT.school} (keine Schulveranstaltung)` },
    { key: "order", label: "Bestellung", value: `${siteUrl()}/bestellung/${order.public_token}` },
    { key: "youth", label: "Jugendschutz", value: "Unter 18 Jahren ohne erziehungsbeauftragte Person nur bis 24 Uhr." },
    { key: "organizer", label: "Veranstalter", value: `${EVENT.organizer}. Keine Schulveranstaltung.` },
  );

  pass.setBarcodes({
    message: ticket.code,
    format: "PKBarcodeFormatQR",
    messageEncoding: "iso-8859-1",
    altText: `${ticket.ticket_number ?? ""}  ${ticket.code}`.trim(),
  });
  pass.setRelevantDate(new Date(type?.id === "afterparty" ? EVENT.afterpartyStartISO : EVENT.startISO));
  pass.setExpirationDate(new Date(new Date(EVENT.endISO).getTime() + 6 * 3600 * 1000));

  return pass.getAsBuffer();
}
