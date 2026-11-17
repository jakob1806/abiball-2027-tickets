import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/supabase";
import { stripe } from "@/lib/stripe";
import { siteUrl } from "@/lib/env";
import { AGE_GROUP_IDS, EVENT } from "@/lib/event";
import { reservationErrorMessage, ticketTypeMap } from "@/lib/orders";
import type { Order } from "@/lib/types";
import { getBankDetails, newTransferReference, sendTransferInstructions, transferDueDate } from "@/lib/transfer";
import { getAvailability } from "@/lib/orders";
import { checkoutLimit, clientIp, hit, tooManyRequests } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const name = z
  .string()
  .trim()
  .max(120)
  .refine((v) => /^\S{2,}(\s+\S+)+$/.test(v), "Bitte jeweils Vor- und Nachname angeben.");

const schema = z
  .object({
    items: z
      .array(z.object({ ticket_type_id: z.string().min(1).max(40), quantity: z.number().int().min(1).max(20) }))
      .min(1),
    name,
    email: z.string().trim().email("Bitte gib eine gültige E-Mail-Adresse an.").max(200),
    relation: z.enum(["abiturient", "gast"]),
    guestOf: z.string().trim().max(120).nullable().optional(),
    guestNames: z.array(name).max(19),
    ageGroups: z.array(z.enum(AGE_GROUP_IDS, { message: "Bitte gib für jede Person das Alter an." })).max(20),
    youthProtection: z.literal(true, { message: "Bitte bestätige den Hinweis zum Jugendschutz." }),
    terms: z.literal(true, { message: "Bitte akzeptiere AGB und Datenschutz." }),
    paymentMethod: z.enum(["stripe", "ueberweisung"]).default("stripe"),
  })
  .superRefine((v, ctx) => {
    const total = v.items.reduce((s, i) => s + i.quantity, 0);
    if (total > 20) ctx.addIssue({ code: "custom", message: "Zu viele Tickets in einer Bestellung." });
    if (v.guestNames.length !== total - 1) ctx.addIssue({ code: "custom", message: "Bitte gib die Namen aller weiteren Gäste an." });
    if (v.ageGroups.length !== total) ctx.addIssue({ code: "custom", message: "Bitte gib für jede Person das Alter am Tag des Abiballs an." });
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
  const ip = clientIp(req);

  // Überweisung nur, wenn im Admin aktiviert und Verkauf offen
  const bank = input.paymentMethod === "ueberweisung" ? await getBankDetails() : null;
  if (bank) {
    if (!bank.enabled) return NextResponse.json({ error: "Überweisung ist derzeit nicht möglich." }, { status: 400 });
    const avail = await getAvailability();
    if (!avail.salesOpen) return NextResponse.json({ error: "Der Ticketverkauf ist derzeit geschlossen." }, { status: 409 });
    // Überweisungen reservieren Plätze für Tage und verschicken eine Mail → strenger begrenzt
    const [okIp, okMail] = await Promise.all([hit("transferPerIp", ip), hit("transferPerEmail", input.email)]);
    if (!okIp || !okMail) {
      return tooManyRequests(
        "transferPerIp",
        "Von hier wurden heute schon mehrere Bestellungen per Überweisung angelegt. Bitte zahle mit Karte oder melde dich beim Abiturjahrgang.",
      );
    }
  } else if (!(await hit("checkout", ip, await checkoutLimit()))) {
    return tooManyRequests("checkout", "Zu viele Bestellversuche in kurzer Zeit. Bitte warte ein paar Minuten und versuche es dann erneut.");
  }

  const { data: order, error } = await db().rpc("create_reservation", {
    p_buyer_name: input.name,
    p_email: input.email,
    p_relation: input.relation,
    p_guest_of: input.relation === "gast" ? input.guestOf : null,
    p_guest_names: input.guestNames,
    p_youth_ack: input.youthProtection,
    p_terms_ack: input.terms,
    p_items: input.items,
    p_payment_method: bank ? "ueberweisung" : "stripe",
    p_free: false,
    p_notes: null,
    p_age_groups: input.ageGroups,
  });
  if (error || !order) {
    const message = reservationErrorMessage(error?.message ?? "");
    return NextResponse.json({ error: message }, { status: 409 });
  }
  const o = order as Order;

  if (bank) {
    const due = transferDueDate(bank.days);
    let updated: Order | null = null;
    for (let i = 0; i < 3 && !updated; i++) {
      const { data } = await db()
        .from("orders")
        .update({ transfer_reference: newTransferReference(), transfer_due_at: due.toISOString(), reserved_until: due.toISOString() })
        .eq("id", o.id)
        .select("*")
        .single();
      updated = (data as Order) ?? null;
    }
    if (!updated) {
      await db().from("orders").update({ status: "expired", reserved_until: null }).eq("id", o.id);
      return NextResponse.json({ error: "Die Bestellung konnte nicht angelegt werden. Bitte versuche es erneut." }, { status: 500 });
    }
    try {
      await sendTransferInstructions(updated, bank);
    } catch (err) {
      console.error("Überweisungs-Mail fehlgeschlagen", err); // Bankdaten stehen auch auf der Bestellseite
    }
    return NextResponse.json({ url: `${siteUrl()}/bestellung/${updated.public_token}?zahlung=ueberweisung` });
  }

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
