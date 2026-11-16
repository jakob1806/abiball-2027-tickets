import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/supabase";
import { requireAdminApi } from "@/lib/admin-auth";
import { reservationErrorMessage } from "@/lib/orders";
import { sendTicketMail } from "@/lib/mail";
import { EVENT } from "@/lib/event";
import type { Order } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({
  items: z.array(z.object({ ticket_type_id: z.string().min(1), quantity: z.number().int().min(1).max(EVENT.maxPerOrder) })).min(1),
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(200),
  relation: z.enum(["abiturient", "gast"]),
  guestOf: z.string().trim().max(120).nullable().optional(),
  guestNames: z.array(z.string().trim().max(120)).max(EVENT.maxPerOrder - 1),
  paymentMethod: z.enum(["bar", "ueberweisung", "frei"]),
  notes: z.string().trim().max(500).optional(),
  sendMail: z.boolean(),
});

/** Manuelle Buchung (bar, Überweisung, frei) – sofort bezahlt, Tickets werden erzeugt. */
export async function POST(req: Request) {
  const denied = await requireAdminApi();
  if (denied) return denied;

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Ungültige Eingabe" }, { status: 400 });
  const v = parsed.data;

  const { data, error } = await db().rpc("create_reservation", {
    p_buyer_name: v.name,
    p_email: v.email,
    p_relation: v.relation,
    p_guest_of: v.relation === "gast" ? v.guestOf ?? null : null,
    p_guest_names: v.guestNames.filter(Boolean),
    p_youth_ack: true,
    p_terms_ack: true,
    p_items: v.items,
    p_payment_method: v.paymentMethod,
    p_free: v.paymentMethod === "frei",
    p_notes: v.notes || null,
  });
  if (error || !data) return NextResponse.json({ error: reservationErrorMessage(error?.message ?? "") }, { status: 409 });
  const order = data as Order;

  const { error: fErr } = await db().rpc("fulfill_order", { p_order_id: order.id, p_session_id: null, p_payment_intent: null });
  if (fErr) return NextResponse.json({ error: fErr.message }, { status: 500 });

  let mailError: string | null = null;
  if (v.sendMail) {
    try {
      await sendTicketMail(order.id);
    } catch (err) {
      mailError = err instanceof Error ? err.message : "Mailversand fehlgeschlagen";
    }
  }
  return NextResponse.json({ id: order.id, mailError });
}
