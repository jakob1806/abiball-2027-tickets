import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/supabase";
import { requireAdminApi } from "@/lib/admin-auth";
import { reservationErrorMessage } from "@/lib/orders";
import { deliverOrQueue } from "@/lib/mail";
import type { Order } from "@/lib/types";
import { AGE_GROUP_IDS } from "@/lib/event";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({
  items: z.array(z.object({ ticket_type_id: z.string().min(1), quantity: z.number().int().min(1).max(20) })).min(1),
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(200),
  relation: z.enum(["abiturient", "gast"]),
  guestOf: z.string().trim().max(120).nullable().optional(),
  guestNames: z.array(z.string().trim().min(2, "Bitte alle Gästenamen angeben.").max(120)).max(19),
  ageGroups: z.array(z.enum(AGE_GROUP_IDS)).max(20),
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
  const total = v.items.reduce((s, i) => s + i.quantity, 0);
  if (v.guestNames.length !== total - 1) return NextResponse.json({ error: "Bitte für jedes weitere Ticket einen Namen angeben." }, { status: 400 });
  if (v.ageGroups.length !== total) return NextResponse.json({ error: "Bitte für jede Person das Alter angeben." }, { status: 400 });

  const { data, error } = await db().rpc("create_reservation", {
    p_buyer_name: v.name,
    p_email: v.email,
    p_relation: v.relation,
    p_guest_of: v.relation === "gast" ? v.guestOf ?? null : null,
    p_guest_names: v.guestNames,
    p_youth_ack: true,
    p_terms_ack: true,
    p_items: v.items,
    p_payment_method: v.paymentMethod,
    p_free: v.paymentMethod === "frei",
    p_notes: v.notes || null,
    p_age_groups: v.ageGroups,
  });
  if (error || !data) return NextResponse.json({ error: reservationErrorMessage(error?.message ?? "") }, { status: 409 });
  const order = data as Order;

  const { error: fErr } = await db().rpc("fulfill_order", { p_order_id: order.id, p_session_id: null, p_payment_intent: null });
  if (fErr) return NextResponse.json({ error: fErr.message }, { status: 500 });

  let mailError: string | null = null;
  if (v.sendMail) {
    const r = await deliverOrQueue(order.id);
    if (r.status === "queued") {
      mailError = r.quotaReached
        ? "Tageslimit für Mails erreicht – die Mail liegt in der Warteschlange und geht automatisch raus."
        : `${r.error} – die Mail liegt in der Warteschlange.`;
    }
  }
  return NextResponse.json({ id: order.id, mailError });
}
