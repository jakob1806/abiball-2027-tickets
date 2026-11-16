import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/supabase";
import { stripe } from "@/lib/stripe";
import { siteUrl } from "@/lib/env";
import { EVENT } from "@/lib/event";
import { reservationErrorMessage, ticketTypeMap } from "@/lib/orders";
import type { Order } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const name = z.string().trim().min(2, "Bitte gib einen Namen an.").max(120);

const schema = z
  .object({
    items: z
      .array(z.object({ ticket_type_id: z.string().min(1).max(40), quantity: z.number().int().min(1).max(EVENT.maxPerOrder) }))
      .min(1),
    name,
    email: z.string().trim().email("Bitte gib eine gültige E-Mail-Adresse an.").max(200),
    relation: z.enum(["abiturient", "gast"]),
    guestOf: z.string().trim().max(120).nullable().optional(),
    guestNames: z.array(name).max(EVENT.maxPerOrder - 1),
    youthProtection: z.literal(true, { message: "Bitte bestätige den Hinweis zum Jugendschutz." }),
    terms: z.literal(true, { message: "Bitte akzeptiere AGB und Datenschutz." }),
  })
  .superRefine((v, ctx) => {
    const total = v.items.reduce((s, i) => s + i.quantity, 0);
    if (total > EVENT.maxPerOrder) ctx.addIssue({ code: "custom", message: `Höchstens ${EVENT.maxPerOrder} Tickets pro Bestellung.` });
    if (v.guestNames.length !== total - 1) ctx.addIssue({ code: "custom", message: "Bitte gib die Namen aller weiteren Gäste an." });
    if (v.relation === "gast" && (!v.guestOf || v.guestOf.length < 2))
      ctx.addIssue({ code: "custom", message: "Bitte gib an, wessen Gast du bist." });
    if (new Set(v.items.map((i) => i.ticket_type_id)).size !== v.items.length)
      ctx.addIssue({ code: "custom", message: "Ungültige Auswahl." });
  });

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Ungültige Anfrage." }, { status: 400 });
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Ungültige Eingabe." }, { status: 400 });
  }
  const input = parsed.data;

  const { data: order, error } = await db().rpc("create_reservation", {
    p_buyer_name: input.name,
    p_email: input.email,
    p_relation: input.relation,
    p_guest_of: input.relation === "gast" ? input.guestOf : null,
    p_guest_names: input.guestNames,
    p_youth_ack: input.youthProtection,
    p_terms_ack: input.terms,
    p_items: input.items,
    p_payment_method: "stripe",
    p_free: false,
    p_notes: null,
  });
  if (error || !order) {
    const message = reservationErrorMessage(error?.message ?? "");
    return NextResponse.json({ error: message }, { status: 409 });
  }
  const o = order as Order;

  try {
    const types = await ticketTypeMap();
    const base = siteUrl();
    const session = await stripe().checkout.sessions.create({
      mode: "payment",
      allowed_payment_method_types: ["card"], // Apple Pay und Google Pay laufen über „card“
      customer_email: o.email,
      locale: "de",
      client_reference_id: o.id,
      metadata: { order_id: o.id },
      payment_intent_data: {
        metadata: { order_id: o.id },
        description: `${EVENT.title} – Bestellung ${o.id.slice(0, 8)}`,
      },
      line_items: input.items.map((i) => ({
        quantity: i.quantity,
        price_data: {
          currency: "eur",
          unit_amount: types[i.ticket_type_id].price_cents,
          product_data: {
            name: `${types[i.ticket_type_id].name} · ${EVENT.title}`,
            description: `${EVENT.dateLabel}, ${types[i.ticket_type_id].admission}, ${EVENT.venueName}`,
          },
        },
      })),
      // Stripe erlaubt minimal 30 Minuten; 1 Minute Puffer für die Laufzeit
      expires_at: Math.floor(Date.now() / 1000) + (EVENT.reservationMinutes + 1) * 60,
      success_url: `${base}/bestellung/${o.public_token}?zahlung=erfolgreich`,
      cancel_url: `${base}/bestellung/${o.public_token}?zahlung=abgebrochen`,
    });

    await db().from("orders").update({ stripe_session_id: session.id }).eq("id", o.id);
    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error("Stripe Checkout fehlgeschlagen", err);
    await db().from("orders").update({ status: "expired", reserved_until: null }).eq("id", o.id);
    return NextResponse.json({ error: "Die Zahlung konnte nicht gestartet werden. Bitte versuche es erneut." }, { status: 502 });
  }
}
