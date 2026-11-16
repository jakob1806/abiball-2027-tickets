import "server-only";
import { randomInt } from "node:crypto";
import { Resend } from "resend";
import { db } from "./supabase";
import { EVENT } from "./event";
import { optionalEnv, requireEnv, siteUrl } from "./env";
import { dateTime, euro } from "./format";
import { deliverOrQueue } from "./mail";
import { button, esc, heading, infoTable, layout, noteBox, paragraph } from "./mail-layout";
import type { Order } from "./types";

export interface BankDetails {
  enabled: boolean;
  holder: string;
  iban: string;
  bic: string;
  bankName: string;
  days: number;
}

/** Kontodaten aus den Einstellungen. Überweisung ist nur aktiv, wenn Inhaber und gültige IBAN hinterlegt sind. */
export async function getBankDetails(): Promise<BankDetails> {
  const { data } = await db()
    .from("settings")
    .select("bank_transfer_enabled, bank_account_holder, bank_iban, bank_bic, bank_name, transfer_days")
    .single();
  const iban = normalizeIban(data?.bank_iban ?? "");
  const holder = (data?.bank_account_holder ?? "").trim();
  return {
    enabled: Boolean(data?.bank_transfer_enabled && holder && isValidIban(iban)),
    holder,
    iban,
    bic: (data?.bank_bic ?? "").trim().toUpperCase(),
    bankName: (data?.bank_name ?? "").trim(),
    days: data?.transfer_days ?? 7,
  };
}

export function normalizeIban(v: string): string {
  return v.replace(/\s+/g, "").toUpperCase();
}

export function formatIban(v: string): string {
  return normalizeIban(v).replace(/(.{4})/g, "$1 ").trim();
}

/** Prüfziffer nach ISO 13616 (Modulo 97). */
export function isValidIban(v: string): boolean {
  const iban = normalizeIban(v);
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]{10,30}$/.test(iban)) return false;
  const rearranged = iban.slice(4) + iban.slice(0, 4);
  let rest = 0;
  for (const ch of rearranged) {
    const n = /\d/.test(ch) ? ch : String(ch.charCodeAt(0) - 55);
    for (const d of n) rest = (rest * 10 + Number(d)) % 97;
  }
  return rest === 1;
}

/** Zahlungsfrist: in `days` Tagen um 23:59 Uhr deutscher Zeit. */
export function transferDueDate(days: number, from = new Date()): Date {
  const target = new Date(from.getTime() + days * 86400000);
  const ymd = new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Berlin" }).format(target);
  const offset = new Intl.DateTimeFormat("en-US", { timeZone: "Europe/Berlin", timeZoneName: "longOffset" })
    .formatToParts(target)
    .find((p) => p.type === "timeZoneName")?.value.replace("GMT", "") || "+01:00";
  return new Date(`${ymd}T23:59:00${offset}`);
}

/** Verwendungszweck, z. B. ABI27-K7Q4MX (ohne verwechselbare Zeichen). */
export function newTransferReference(): string {
  const a = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let s = "ABI27-";
  for (let i = 0; i < 6; i++) s += a[randomInt(a.length)];
  return s;
}

/** EPC-QR-Code („GiroCode“): Banking-Apps übernehmen Empfänger, IBAN, Betrag und Verwendungszweck. */
export function epcPayload(bank: BankDetails, amountCents: number, reference: string): string {
  return [
    "BCD",
    "002",
    "1",
    "SCT",
    bank.bic,
    bank.holder.slice(0, 70),
    bank.iban,
    `EUR${(amountCents / 100).toFixed(2)}`,
    "",
    "",
    reference,
  ].join("\n");
}

async function sendMail(to: string, subject: string, preheader: string, body: string, text: string) {
  const resend = new Resend(requireEnv("RESEND_API_KEY"));
  const { error } = await resend.emails.send({
    from: requireEnv("MAIL_FROM"),
    to,
    replyTo: optionalEnv("MAIL_REPLY_TO"),
    subject,
    html: layout({ preheader, body }),
    text,
  });
  if (error) throw new Error(`Resend: ${error.message}`);
}

function bankRows(bank: BankDetails, order: Order): [string, string][] {
  const rows: [string, string][] = [
    ["Empfänger", esc(bank.holder)],
    ["IBAN", `<span style="font-family:Menlo,Consolas,monospace">${esc(formatIban(bank.iban))}</span>`],
  ];
  if (bank.bic) rows.push(["BIC", `<span style="font-family:Menlo,Consolas,monospace">${esc(bank.bic)}</span>`]);
  rows.push(["Betrag", `<strong>${esc(euro(order.amount_cents))}</strong>`]);
  rows.push(["Verwendungszweck", `<strong style="font-family:Menlo,Consolas,monospace">${esc(order.transfer_reference ?? "")}</strong>`]);
  rows.push(["Zahlungsfrist", `${esc(dateTime(order.transfer_due_at))} Uhr`]);
  return rows;
}

function bankText(bank: BankDetails, order: Order): string {
  return [
    `Empfänger: ${bank.holder}`,
    `IBAN: ${formatIban(bank.iban)}`,
    bank.bic ? `BIC: ${bank.bic}` : "",
    `Betrag: ${euro(order.amount_cents)}`,
    `Verwendungszweck: ${order.transfer_reference}`,
    `Zahlungsfrist: ${dateTime(order.transfer_due_at)} Uhr`,
  ].filter(Boolean).join("\n");
}

export async function sendTransferInstructions(order: Order, bank: BankDetails) {
  const url = `${siteUrl()}/bestellung/${order.public_token}`;
  const first = order.buyer_name.split(" ")[0];
  const body = [
    heading("Fast geschafft.", 1),
    paragraph(`Hallo ${esc(first)},<br>danke für deine Bestellung! Deine Plätze sind reserviert. Bitte überweise den Betrag bis <strong>${esc(dateTime(order.transfer_due_at))} Uhr</strong> – danach schicken wir dir deine Tickets.`),
    heading("Überweisung"),
    infoTable(bankRows(bank, order)),
    noteBox("<strong>Wichtig:</strong> Gib genau diesen Verwendungszweck an, damit wir deine Zahlung zuordnen können. Am einfachsten geht es mit dem <strong>GiroCode</strong> auf deiner Bestellseite – einfach mit der Banking-App scannen."),
    `<div style="margin:4px 0 22px">${button(url, "Bestellung & GiroCode ansehen")}</div>`,
    paragraph("Geht bis zur Frist keine Zahlung ein, wird die Bestellung automatisch storniert und die Plätze werden wieder freigegeben.", { small: true, muted: true }),
  ].join("\n");
  const text = `Hallo ${first},\n\ndanke für deine Bestellung! Bitte überweise bis ${dateTime(order.transfer_due_at)} Uhr:\n\n${bankText(bank, order)}\n\nBestellung & GiroCode: ${url}\n\nOhne Zahlungseingang wird die Bestellung nach Ablauf der Frist automatisch storniert.`;
  await sendMail(order.email, `Bitte überweisen: ${EVENT.title} (${order.transfer_reference})`, `Bitte bis ${dateTime(order.transfer_due_at)} überweisen – Verwendungszweck ${order.transfer_reference}`, body, text);
}

export async function sendTransferReminder(order: Order, bank: BankDetails) {
  const url = `${siteUrl()}/bestellung/${order.public_token}`;
  const first = order.buyer_name.split(" ")[0];
  const body = [
    heading("Kleine Erinnerung", 1),
    paragraph(`Hallo ${esc(first)},<br>für deine Bestellung ist noch keine Zahlung eingegangen. Deine Plätze sind nur noch bis <strong>${esc(dateTime(order.transfer_due_at))} Uhr</strong> reserviert.`),
    heading("Überweisung"),
    infoTable(bankRows(bank, order)),
    `<div style="margin:4px 0 22px">${button(url, "Bestellung & GiroCode ansehen")}</div>`,
    paragraph("Schon überwiesen? Dann ist alles gut – Überweisungen brauchen manchmal 1–2 Werktage.", { small: true, muted: true }),
  ].join("\n");
  const text = `Hallo ${first},\n\nfür deine Bestellung ist noch keine Zahlung eingegangen. Deine Plätze sind nur noch bis ${dateTime(order.transfer_due_at)} Uhr reserviert.\n\n${bankText(bank, order)}\n\n${url}`;
  await sendMail(order.email, `Erinnerung: Zahlung für den ${EVENT.title}`, `Deine Plätze sind nur noch bis ${dateTime(order.transfer_due_at)} reserviert`, body, text);
}

export async function sendTransferCancelled(order: Order) {
  const first = order.buyer_name.split(" ")[0];
  const body = [
    heading("Bestellung storniert", 1),
    paragraph(`Hallo ${esc(first)},<br>für deine Bestellung (Verwendungszweck <strong>${esc(order.transfer_reference ?? "")}</strong>) ist bis zur Frist keine Zahlung eingegangen. Wir haben die Bestellung deshalb storniert und die Plätze wieder freigegeben.`),
    paragraph("Du hast inzwischen doch überwiesen? Dann antworte einfach auf diese Mail – wir klären das.", { small: true }),
    `<div style="margin:4px 0 22px">${button(siteUrl(), "Neu bestellen", "ghost")}</div>`,
  ].join("\n");
  const text = `Hallo ${first},\n\nfür deine Bestellung (${order.transfer_reference}) ist bis zur Frist keine Zahlung eingegangen. Die Bestellung wurde storniert.\n\nDoch überwiesen? Antworte einfach auf diese Mail.\n\nNeu bestellen: ${siteUrl()}`;
  await sendMail(order.email, `Bestellung storniert: ${EVENT.title}`, "Ohne Zahlungseingang storniert – Plätze wieder freigegeben", body, text);
}

/** Zahlungseingang bestätigen: Tickets erzeugen und Ticketmail senden (bzw. in die Warteschlange). */
export async function markTransferPaid(orderId: string) {
  const { error } = await db().rpc("fulfill_order", { p_order_id: orderId, p_session_id: null, p_payment_intent: null });
  if (error) throw error;
  await db().from("orders").update({ transfer_due_at: null }).eq("id", orderId);
  return deliverOrQueue(orderId);
}

/** Täglich: Erinnerung 2 Tage vor Ablauf, abgelaufene Bestellungen stornieren und benachrichtigen. */
export async function processTransfers(): Promise<{ reminded: number; cancelled: number }> {
  const bank = await getBankDetails();
  const now = new Date();
  let reminded = 0;
  let cancelled = 0;

  const { data: open, error } = await db()
    .from("orders")
    .select("*")
    .eq("status", "pending")
    .eq("payment_method", "ueberweisung")
    .not("transfer_due_at", "is", null);
  if (error) throw error;

  for (const o of (open ?? []) as Order[]) {
    const due = new Date(o.transfer_due_at!);
    if (due <= now) {
      const { data: upd } = await db()
        .from("orders")
        .update({ status: "expired", reserved_until: null, cancelled_at: now.toISOString() })
        .eq("id", o.id)
        .eq("status", "pending")
        .select("id");
      if (upd && upd.length) {
        cancelled += 1;
        await sendTransferCancelled(o).catch((e) => console.error("Storno-Mail", o.id, e));
      }
    } else if (!o.transfer_reminder_sent_at && due.getTime() - now.getTime() <= 2 * 86400000) {
      try {
        await sendTransferReminder(o, bank);
        await db().from("orders").update({ transfer_reminder_sent_at: now.toISOString() }).eq("id", o.id);
        reminded += 1;
      } catch (e) {
        console.error("Erinnerung", o.id, e);
      }
    }
  }
  return { reminded, cancelled };
}
