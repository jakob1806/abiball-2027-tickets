import { NextResponse } from "next/server";
import { db } from "@/lib/supabase";
import { stripe } from "@/lib/stripe";
import { requireAdminApi } from "@/lib/admin-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const denied = await requireAdminApi();
  if (denied) return denied;

  const { data: order } = await db()
    .from("orders")
    .select("id, status, payment_method, stripe_payment_intent")
    .eq("id", params.id)
    .maybeSingle();
  if (!order) return NextResponse.json({ error: "Bestellung nicht gefunden" }, { status: 404 });
  if (order.payment_method !== "stripe" || !order.stripe_payment_intent) {
    return NextResponse.json({ error: "Keine Stripe-Zahlung vorhanden" }, { status: 409 });
  }
  if (!["paid", "cancelled"].includes(order.status)) {
    return NextResponse.json({ error: "Bestellung kann nicht erstattet werden" }, { status: 409 });
  }

  try {
    await stripe().refunds.create(
      { payment_intent: order.stripe_payment_intent, reason: "requested_by_customer" },
      { idempotencyKey: `refund-${order.id}` },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Stripe-Fehler";
    return NextResponse.json({ error: `Erstattung fehlgeschlagen: ${message}` }, { status: 502 });
  }

  const now = new Date().toISOString();
  await db().from("orders").update({ status: "refunded", refunded_at: now }).eq("id", order.id);
  await db().from("tickets").update({ status: "cancelled" }).eq("order_id", order.id);
  return NextResponse.json({ message: "Erstattung über Stripe ausgelöst, Tickets ungültig." });
}
