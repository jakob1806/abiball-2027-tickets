import "server-only";
import { randomInt } from "node:crypto";
import { Resend } from "resend";
import { db } from "./supabase";
import { EVENT } from "./event";
import { optionalEnv, requireEnv, siteUrl } from "./env";
import { dateTime, euro } from "./format";
import { deliverOrQueue } from "./mail";
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

async function sendMail(to: string, subject: string, paragraphs: string[], button?: { href: string; label: string }) {
  const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
  const html = `<!doctype html><html lang="de"><body style="margin:0;background:#fff;color:#000;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif">
<div style="max-width:560px;margin:0 auto;padding:40px 24px">
  <p style="font-size:14px;color:#6b6b6b;margin:0 0 8px">${esc(EVENT.school)}</p>
  <h1 style="font-size:36px;line-height:1.05;margin:0 0 24px;letter-spacing:-0.02em">${esc(EVENT.title)}</h1>
  ${paragraphs.map((p) => `<p style="font-size:16px;line-height:1.55">${p}</p>`).join("\n")}
  ${button ? `<p style="margin:28px 0"><a href="${esc(button.href)}" style="display:inline-block;background:#000;color:#fff;text-decoration:none;padding:14px 22px;border-radius:999px;font-weight:600">${esc(button.label)}</a></p>` : ""}
  <hr style="border:0;border-top:1px solid #e5e5e5;margin:32px 0">
  <p style="font-size:12px;color:#6b6b6b">Veranstalter: ${esc(EVENT.organizer)}. Keine Schulveranstaltung.</p>
</div></body></html>`;
  const text = paragraphs.map((p) => p.replace(/<br\s*\/?>/g, "\n").replace(/<[^>]+>/g, "")).join("\n\n") + (button ? `\n\n${button.label}: ${button.href}` : "");
  const resend = new Resend(requireEnv("RESEND_API_KEY"));
  const { error } = await resend.emails.send({ from: requireEnv("MAIL_FROM"), to, replyTo: optionalEnv("MAIL_REPLY_TO"), subject, html, text });
  if (error) throw new Error(`Resend: ${error.message}`);
}

function bankBlock(bank: BankDetails, order: Order): string {
  return [
    `<strong>Empfänger:</strong> ${bank.holder}`,
    `<strong>IBAN:</strong> ${formatIban(bank.iban)}`,
    bank.bic ? `<strong>BIC:</strong> ${bank.bic}` : "",
    `<strong>Betrag:</strong> ${euro(order.amount_cents)}`,
    `<strong>Verwendungszweck:</strong> ${order.transfer_reference}`,
  ]
    .filter(Boolean)
    .join("<br>");
}

export async function sendTransferInstructions(order: Order, bank: BankDetails) {
  const url = `${siteUrl()}/bestellung/${order.public_token}`;
  await sendMail(order.email, `Bitte überweisen: ${EVENT.title}`, [
    `Hallo ${order.buyer_name},`,
    `danke für deine Bestellung. Deine Plätze sind bis <strong>${dateTime(order.transfer_due_at)} Uhr</strong> reserviert. Bitte überweise bis dahin:`,
    bankBlock(bank, order),
    `Wichtig: Gib genau diesen Verwendungszweck an, damit wir deine Zahlung zuordnen können. Sobald das Geld da ist, schicken wir dir deine Tickets per E-Mail. Geht bis zur Frist keine Zahlung ein, wird die Bestellung automatisch storniert.`,
  ], { href: url, label: "Bestellung und GiroCode ansehen" });
}

export async function sendTransferReminder(order: Order, bank: BankDetails) {
  const url = `${siteUrl()}/bestellung/${order.public_token}`;
  await sendMail(order.email, `Erinnerung: Zahlung für den ${EVENT.title}`, [
    `Hallo ${order.buyer_name},`,
    `für deine Bestellung ist noch keine Zahlung eingegangen. Deine Plätze sind nur noch bis <strong>${dateTime(order.transfer_due_at)} Uhr</strong> reserviert.`,
    bankBlock(bank, order),
    `Falls du schon überwiesen hast, ist alles gut – Überweisungen brauchen manchmal 1–2 Werktage.`,
  ], { href: url, label: "Bestellung ansehen" });
}

export async function sendTransferCancelled(order: Order) {
  await sendMail(order.email, `Bestellung storniert: ${EVENT.title}`, [
    `Hallo ${order.buyer_name},`,
    `für deine Bestellung (Verwendungszweck ${order.transfer_reference}) ist bis zur Frist keine Zahlung eingegangen. Die Bestellung wurde deshalb storniert und die Plätze wieder freigegeben.`,
    `Falls du inzwischen doch überwiesen hast, melde dich bitte bei uns – wir klären das. Solange noch Plätze frei sind, kannst du jederzeit neu bestellen.`,
  ], { href: siteUrl(), label: "Neu bestellen" });
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
