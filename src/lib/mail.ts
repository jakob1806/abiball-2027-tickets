import "server-only";
import { Resend } from "resend";
import { EVENT } from "./event";
import { button, esc, heading, infoTable, layout, mapsUrl, noteBox, paragraph, ticketList } from "./mail-layout";
import type { OrderWithDetails, Ticket, TicketType } from "./types";
import { optionalEnv, requireEnv, siteUrl } from "./env";
import { euro } from "./format";
import { buildIcs } from "./ics";
import { getOrderById, ticketTypeMap } from "./orders";
import { buildTicketsPdf } from "./pdf";
import { buildPkpass, isAppleWalletConfigured } from "./pkpass";
import { googleWalletUrl } from "./gwallet";
import { db } from "./supabase";


/** Versendet die Ticketmail mit PDF, .pkpass-Dateien und .ics. Setzt mail_sent_at. */
export async function sendTicketMail(orderId: string): Promise<void> {
  const order = await getOrderById(orderId);
  if (!order) throw new Error("Bestellung nicht gefunden");
  if (order.status !== "paid") throw new Error("Bestellung ist nicht bezahlt");

  const types = await ticketTypeMap();
  const tickets = order.tickets.filter((t) => t.status === "valid");
  if (tickets.length === 0) throw new Error("Keine gültigen Tickets");

  const orderUrl = `${siteUrl()}/bestellung/${order.public_token}`;
  const afterpartyOnly = tickets.every((t) => t.ticket_type_id === "afterparty");

  const attachments: { filename: string; content: Buffer; contentType?: string }[] = [
    { filename: "Abiball-2027-Tickets.pdf", content: await buildTicketsPdf(order, tickets, types), contentType: "application/pdf" },
    {
      filename: "Abiball-2027.ics",
      content: Buffer.from(buildIcs({ uid: order.id, afterpartyOnly, orderUrl }), "utf8"),
      contentType: "text/calendar",
    },
  ];

  if (isAppleWalletConfigured()) {
    for (const [i, t] of tickets.entries()) {
      try {
        attachments.push({
          filename: `Abiball-2027-Ticket-${i + 1}.pkpass`,
          content: await buildPkpass(order, t, types[t.ticket_type_id]),
          contentType: "application/vnd.apple.pkpass",
        });
      } catch (err) {
        console.error("pkpass fehlgeschlagen", t.code, err);
      }
    }
  }

  let gUrl: string | null = null;
  try {
    gUrl = await googleWalletUrl(order, tickets, types);
  } catch (err) {
    console.error("Google Wallet fehlgeschlagen", err);
  }

  const { html, text, subject } = buildTicketMail({
    order,
    tickets,
    types,
    orderUrl,
    googleWalletUrl: gUrl,
    appleAttached: attachments.some((x) => x.filename.endsWith(".pkpass")),
  });

  const resend = new Resend(requireEnv("RESEND_API_KEY"));
  const payload = {
    from: requireEnv("MAIL_FROM"),
    to: order.email,
    replyTo: optionalEnv("MAIL_REPLY_TO"),
    subject,
    html,
    text,
    attachments,
  };
  let { error } = await resend.emails.send(payload);
  // Kurzzeitiges Ratenlimit (wenige Mails pro Sekunde): einmal kurz warten und erneut senden
  if (error && /rate_limit/i.test(error.name ?? "")) {
    await new Promise((r) => setTimeout(r, 1200));
    ({ error } = await resend.emails.send(payload));
  }
  if (error) {
    const quota = /quota|rate_limit/i.test(`${error.name ?? ""} ${error.message ?? ""}`);
    throw new MailSendError(`Resend: ${error.message}`, quota);
  }

  await db()
    .from("orders")
    .update({ mail_sent_at: new Date().toISOString(), mail_queued_at: null, mail_last_error: null })
    .eq("id", order.id);
}

export class MailSendError extends Error {
  constructor(message: string, public readonly quotaReached: boolean) {
    super(message);
    this.name = "MailSendError";
  }
}

export type DeliveryResult = { status: "sent" } | { status: "queued"; quotaReached: boolean; error: string };

/**
 * Versucht die Ticketmail zu senden. Klappt das nicht (z. B. Tageslimit bei Resend erreicht),
 * wird die Bestellung in die Warteschlange gelegt und später automatisch erneut versucht.
 */
export async function deliverOrQueue(orderId: string): Promise<DeliveryResult> {
  try {
    await sendTicketMail(orderId);
    return { status: "sent" };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const quotaReached = err instanceof MailSendError && err.quotaReached;
    const { data } = await db().from("orders").select("mail_queued_at, mail_attempts").eq("id", orderId).single();
    await db()
      .from("orders")
      .update({
        mail_queued_at: data?.mail_queued_at ?? new Date().toISOString(),
        mail_attempts: (data?.mail_attempts ?? 0) + 1,
        mail_last_error: message.slice(0, 500),
      })
      .eq("id", orderId);
    console.warn(`Mail für ${orderId} in Warteschlange: ${message}`);
    return { status: "queued", quotaReached, error: message };
  }
}

/** Arbeitet die Warteschlange ab (älteste zuerst). Stoppt, sobald das Limit wieder greift. */
export async function processMailQueue(max = 50): Promise<{ sent: number; remaining: number; stoppedByQuota: boolean }> {
  const { data, error } = await db()
    .from("orders")
    .select("id")
    .eq("status", "paid")
    .is("mail_sent_at", null)
    .not("mail_queued_at", "is", null)
    .order("mail_queued_at", { ascending: true })
    .limit(max);
  if (error) throw error;

  let sent = 0;
  let stoppedByQuota = false;
  for (const { id } of data ?? []) {
    const r = await deliverOrQueue(id);
    if (r.status === "sent") sent += 1;
    else if (r.quotaReached) {
      stoppedByQuota = true;
      break;
    }
  }
  const { count } = await db()
    .from("orders")
    .select("id", { count: "exact", head: true })
    .eq("status", "paid")
    .is("mail_sent_at", null)
    .not("mail_queued_at", "is", null);
  return { sent, remaining: count ?? 0, stoppedByQuota };
}

/** Inhalt der Buchungsbestätigung (auch für die Vorschau nutzbar). */
export function buildTicketMail({
  order,
  tickets,
  types,
  orderUrl,
  googleWalletUrl,
  appleAttached,
}: {
  order: OrderWithDetails;
  tickets: Ticket[];
  types: Record<string, TicketType>;
  orderUrl: string;
  googleWalletUrl: string | null;
  appleAttached: boolean;
}): { html: string; text: string; subject: string } {
  const sorted = [...tickets].sort(
    (a, b) =>
      Number(b.ticket_type_id === "ball") - Number(a.ticket_type_id === "ball") ||
      (a.ticket_number ?? "").localeCompare(b.ticket_number ?? "", "de", { numeric: true }),
  );
  const numbers = sorted.map((t) => t.ticket_number).filter(Boolean).join(", ");
  const onlyAfter = sorted.every((t) => t.ticket_type_id !== "ball");
  const firstName = order.buyer_name.split(" ")[0];
  const payLabel: Record<string, string> = { stripe: "Karte / Apple Pay / Google Pay", ueberweisung: "Überweisung", bar: "Bar", frei: "Freiticket" };

  const attachmentsNote = [
    "<strong>Im Anhang:</strong> deine Tickets als PDF",
    appleAttached ? ", je Ticket eine Apple-Wallet-Datei (auf dem iPhone antippen → „Hinzufügen“)" : "",
    " und eine Kalenderdatei.",
  ].join("");

  const body = [
    heading("Du bist dabei.", 1),
    paragraph(`Hallo ${esc(firstName)},<br>danke für deine Bestellung – wir freuen uns auf dich! Hier sind deine Tickets für den ${esc(EVENT.title)}.`),
    heading(sorted.length === 1 ? "Dein Ticket" : `Deine ${sorted.length} Tickets`),
    ticketList(
      sorted.map((t) => ({
        number: t.ticket_number ?? t.code,
        typeId: t.ticket_type_id,
        typeName: types[t.ticket_type_id]?.name ?? t.ticket_type_id,
        holder: t.holder_name,
        admission: t.ticket_type_id === "ball" ? "Einlass ab 19:00 Uhr" : "Einlass ab 22:30 Uhr",
      })),
    ),
    `<div style="margin:8px 0 22px">${button(orderUrl, "Tickets & QR-Codes ansehen")}${googleWalletUrl ? button(googleWalletUrl, "Zu Google Wallet", "ghost") : ""}</div>`,
    noteBox(attachmentsNote),
    heading("Der Abend"),
    infoTable([
      ["Datum", esc(EVENT.dateLabel)],
      ["Uhrzeit", onlyAfter ? "22:30 bis 04:00 Uhr" : `${esc(EVENT.timeLabel)}<br><span style="color:#6b6b6b;font-size:13px">Afterparty ab 22:30 Uhr</span>`],
      ["Ort", `${esc(EVENT.venueName)}<br>${esc(EVENT.venueStreet)}<br>${esc(EVENT.venueCity)}<br><a href="${mapsUrl()}" style="color:#000000;font-size:13px">In Karten öffnen →</a>`],
    ]),
    heading("Deine Bestellung"),
    infoTable([
      ["Besteller/in", esc(order.buyer_name)],
      ["Tickets", sorted.length === 1 ? esc(numbers) : `${sorted.length} · ${esc(numbers)}`],
      ["Betrag", esc(euro(order.amount_cents))],
      ["Zahlung", esc(payLabel[order.payment_method] ?? order.payment_method)],
    ]),
    heading("Gut zu wissen"),
    paragraph(
      [
        "• Jeder QR-Code gilt für <strong>genau einen Einlass</strong> – bitte leite Tickets nur an die jeweiligen Gäste weiter.",
        "• Bring einen <strong>Lichtbildausweis</strong> mit.",
        "• Unter 16 Jahren nur mit Begleitung, unter 18 Jahren ohne erziehungsbeauftragte Person nur bis 24 Uhr.",
      ].join("<br>"),
      { small: true },
    ),
    paragraph("Fragen? Antworte einfach auf diese Mail.", { small: true, muted: true }),
  ].join("\n");

  const text = [
    `Hallo ${firstName},`,
    "",
    `danke für deine Bestellung! Deine Tickets für den ${EVENT.title}:`,
    ...sorted.map((t) => `- ${t.ticket_number ?? ""} ${types[t.ticket_type_id]?.name ?? t.ticket_type_id}: ${t.holder_name}`),
    "",
    `${EVENT.dateLabel}, ${EVENT.timeLabel}`,
    `${EVENT.venueName}, ${EVENT.venueStreet}, ${EVENT.venueCity}`,
    "",
    `Tickets & QR-Codes: ${orderUrl}`,
    googleWalletUrl ? `Google Wallet: ${googleWalletUrl}` : "",
    "",
    "Im Anhang: Tickets als PDF" + (appleAttached ? ", Apple-Wallet-Dateien" : "") + " und Kalenderdatei.",
    "Jeder QR-Code gilt für genau einen Einlass. Bitte Ausweis mitbringen.",
    "",
    `Veranstalter: ${EVENT.organizer}. Keine Schulveranstaltung.`,
  ]
    .filter((l) => l !== "")
    .join("\n");

  return {
    html: layout({ preheader: `Deine Tickets ${numbers} – ${EVENT.dateLabel}, ${EVENT.venueName}`, body }),
    text,
    subject: `Deine Tickets für den ${EVENT.title} (${numbers})`,
  };
}
