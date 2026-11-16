import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/supabase";
import { requireScanner } from "@/lib/scanner-api";
import { getAvailability, getTicketTypes, reservationErrorMessage } from "@/lib/orders";
import { AGE_GROUP_IDS, EVENT } from "@/lib/event";
import type { Order } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({
  persons: z
    .array(
      z.object({
        name: z.string().trim().min(2, "Bitte für jede Person einen Namen angeben.").max(120),
        ageGroup: z.enum(AGE_GROUP_IDS, { message: "Bitte für jede Person das Alter angeben." }),
      }),
    )
    .min(1, "Bitte mindestens eine Person angeben.")
    .max(8, "Höchstens 8 Personen auf einmal."),
});

/** Preis, freie Plätze und Kassenstand der Abendkasse. */
export async function GET(req: Request) {
  const { denied } = await requireScanner(req);
  if (denied) return denied;
  const [types, avail, sales] = await Promise.all([
    getTicketTypes(false),
    getAvailability(),
    db()
      .from("orders")
      .select("id, amount_cents, paid_at, notes, tickets(holder_name, ticket_number, age_group)")
      .eq("payment_method", "abendkasse")
      .eq("status", "paid")
      .order("paid_at", { ascending: false }),
  ]);
  if (sales.error) return NextResponse.json({ error: sales.error.message }, { status: 500 });
  const type = types.find((t) => t.id === EVENT.doorTicketTypeId);
  type Sale = { id: string; amount_cents: number; paid_at: string | null; notes: string | null; tickets: { holder_name: string; ticket_number: string | null; age_group: string | null }[] };
  const list = (sales.data ?? []) as Sale[];
  return NextResponse.json({
    ticketTypeName: type?.name ?? null,
    priceCents: type?.price_cents ?? null,
    available: type ? avail.perType[type.id] ?? 0 : 0,
    maxPerSale: Math.min(8, avail.maxPerOrder),
    totalTickets: list.reduce((s, o) => s + o.tickets.length, 0),
    totalCents: list.reduce((s, o) => s + o.amount_cents, 0),
    sales: list.slice(0, 50).map((o) => ({
      id: o.id,
      paid_at: o.paid_at,
      amount_cents: o.amount_cents,
      seller: o.notes?.replace(/^Abendkasse · /, "") ?? null,
      tickets: o.tickets,
    })),
  });
}

/**
 * Verkauf an der Abendkasse: nur Afterparty-Tickets, Barzahlung.
 * Die Gäste sind danach direkt eingelassen; protokolliert wird, wer verkauft hat.
 */
export async function POST(req: Request) {
  const { scanner, denied } = await requireScanner(req);
  if (denied) return denied;

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Ungültige Eingabe" }, { status: 400 });
  const { persons } = parsed.data;

  const { data, error } = await db().rpc("create_reservation", {
    p_buyer_name: persons[0].name,
    p_email: "",
    p_relation: "gast",
    p_guest_of: "Abendkasse",
    p_guest_names: persons.slice(1).map((p) => p.name),
    p_youth_ack: true,
    p_terms_ack: true,
    p_items: [{ ticket_type_id: EVENT.doorTicketTypeId, quantity: persons.length }],
    p_payment_method: "abendkasse",
    p_free: false,
    p_notes: `Abendkasse · ${scanner!.label}`,
    p_age_groups: persons.map((p) => p.ageGroup),
  });
  if (error || !data) return NextResponse.json({ error: reservationErrorMessage(error?.message ?? "") }, { status: 409 });
  const order = data as Order;

  const { error: fErr } = await db().rpc("fulfill_order", { p_order_id: order.id, p_session_id: null, p_payment_intent: null });
  if (fErr) return NextResponse.json({ error: fErr.message }, { status: 500 });

  // Wer an der Abendkasse zahlt, ist direkt drin
  const now = new Date().toISOString();
  const { data: tickets, error: tErr } = await db()
    .from("tickets")
    .update({ checked_in_at: now, checked_in_by: scanner!.id, checked_in_by_label: scanner!.label })
    .eq("order_id", order.id)
    .select("id, code, ticket_number, holder_name, age_group");
  if (tErr) return NextResponse.json({ error: tErr.message }, { status: 500 });
  await db()
    .from("checkins")
    .insert((tickets ?? []).map((t) => ({ ticket_id: t.id, code: t.code, result: "ok", scanner_user_id: scanner!.id, scanner_label: scanner!.label })));

  return NextResponse.json({ id: order.id, amount_cents: order.amount_cents, tickets });
}
