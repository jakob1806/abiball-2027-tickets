import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { db } from "@/lib/supabase";
import { stripe } from "@/lib/stripe";
import { requireEnv } from "@/lib/env";
import { sendTicketMail } from "@/lib/mail";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const signature = req.headers.get("stripe-signature");
  const payload = await req.text();

  let event: Stripe.Event;
  try {
    event = stripe().webhooks.constructEvent(payload, signature ?? "", requireEnv("STRIPE_WEBHOOK_SECRET"));
  } catch (err) {
    console.error("Webhook-Signatur ungültig", err);
    return NextResponse.json({ error: "Ungültige Signatur" }, { status: 400 });
  }

  // Bereits vollständig verarbeitet? Dann sofort bestätigen.
  const { data: seen } = await db().from("stripe_events").select("id").eq("id", event.id).maybeSingle();
  if (seen) return NextResponse.json({ received: true, duplicate: true });

  try {
    switch (event.type) {
      case "checkout.session.completed":
      case "checkout.session.async_payment_succeeded": {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.payment_status !== "paid") break; // asynchrone Zahlung noch offen
        await fulfill(session);
        break;
      }
      case "checkout.session.expired":
      case "checkout.session.async_payment_failed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const orderId = session.metadata?.order_id;
        if (orderId) {
          await db()
            .from("orders")
            .update({ status: "expired", reserved_until: null })
            .eq("id", orderId)
            .eq("status", "pending");
        }
        break;
      }
      case "charge.refunded": {
        const charge = event.data.object as Stripe.Charge;
        const pi = typeof charge.payment_intent === "string" ? charge.payment_intent : charge.payment_intent?.id;
        if (pi && charge.refunded) await markRefunded(pi);
        break;
      }
      default:
        break;
    }
  } catch (err) {
    console.error("Webhook-Verarbeitung fehlgeschlagen", event.type, err);
    // 500 => Stripe versucht es später erneut
    return NextResponse.json({ error: "Verarbeitung fehlgeschlagen" }, { status: 500 });
  }

  await db().from("stripe_events").upsert({ id: event.id, type: event.type }, { onConflict: "id", ignoreDuplicates: true });
  return NextResponse.json({ received: true });
}

async function fulfill(session: Stripe.Checkout.Session) {
  const orderId = session.metadata?.order_id ?? session.client_reference_id;
  if (!orderId) throw new Error(`Session ${session.id} ohne order_id`);
  const pi = typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id ?? null;

  // Idempotent: erzeugt Tickets nur beim ersten Aufruf (Zeilensperre in der DB)
  const { error } = await db().rpc("fulfill_order", {
    p_order_id: orderId,
    p_session_id: session.id,
    p_payment_intent: pi,
  });
  if (error) {
    if (error.message.includes("ORDER_NOT_FULFILLABLE")) {
      // Bestellung wurde zwischenzeitlich storniert – Zahlung muss manuell erstattet werden
      console.error(`Zahlung für stornierte Bestellung ${orderId} eingegangen (${pi}). Bitte im Admin erstatten.`);
      return;
    }
    throw error;
  }

  // Mail nur, wenn sie noch nicht verschickt wurde (auch bei Wiederholungen nach Mailfehler)
  const { data: order } = await db().from("orders").select("mail_sent_at, amount_cents").eq("id", orderId).single();
  if (order && session.amount_total != null && session.amount_total !== order.amount_cents) {
    console.warn(`Betrag weicht ab: Stripe ${session.amount_total} vs. Bestellung ${order.amount_cents} (${orderId})`);
  }
  if (order && !order.mail_sent_at) await sendTicketMail(orderId);
}

async function markRefunded(paymentIntent: string) {
  const { data: order } = await db()
    .from("orders")
    .select("id, status")
    .eq("stripe_payment_intent", paymentIntent)
    .maybeSingle();
  if (!order || order.status === "refunded") return;
  const now = new Date().toISOString();
  await db().from("orders").update({ status: "refunded", refunded_at: now }).eq("id", order.id);
  await db().from("tickets").update({ status: "cancelled" }).eq("order_id", order.id);
}
