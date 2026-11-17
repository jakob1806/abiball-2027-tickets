import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/supabase";
import { requireAdminApi } from "@/lib/admin-auth";
import type { Availability } from "@/lib/orders";
import { isValidIban, normalizeIban } from "@/lib/transfer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({
  settings: z.object({
    total_capacity: z.number().int().min(1).max(5000),
    max_per_order: z.number().int().min(1).max(20),
    checkout_limit: z.number().int().min(1, "Bestellungen pro Gerät: mindestens 1.").max(500, "Bestellungen pro Gerät: höchstens 500."),
    sales_open: z.boolean(),
    prices_final: z.boolean(),
    bank_transfer_enabled: z.boolean(),
    bank_account_holder: z.string().trim().max(70),
    bank_iban: z.string().trim().max(42),
    bank_bic: z.string().trim().max(11),
    bank_name: z.string().trim().max(80),
    transfer_days: z.number().int().min(2).max(30),
  }),
  types: z
    .array(
      z.object({
        id: z.string().min(1).max(40),
        name: z.string().trim().min(2).max(80),
        description: z.string().trim().max(300),
        admission: z.string().trim().min(2).max(60),
        price_cents: z.number().int().min(0).max(100000),
        quota: z.number().int().min(0).max(5000),
        active: z.boolean(),
      }),
    )
    .min(1),
});

export async function PATCH(req: Request) {
  const denied = await requireAdminApi();
  if (denied) return denied;
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Ungültige Eingabe" }, { status: 400 });
  const { settings, types } = parsed.data;
  settings.bank_iban = normalizeIban(settings.bank_iban);
  settings.bank_bic = settings.bank_bic.toUpperCase();
  if (settings.bank_iban && !isValidIban(settings.bank_iban)) {
    return NextResponse.json({ error: "Die IBAN ist ungültig (Prüfziffer stimmt nicht)." }, { status: 400 });
  }
  if (settings.bank_transfer_enabled && (!settings.bank_iban || !settings.bank_account_holder)) {
    return NextResponse.json({ error: "Für Überweisung bitte Kontoinhaber und IBAN eintragen." }, { status: 400 });
  }

  // Kontingente dürfen nicht unter bereits verkaufte/reservierte Plätze sinken
  const { data: avail, error: aErr } = await db().rpc("ticket_availability");
  if (aErr) return NextResponse.json({ error: aErr.message }, { status: 500 });
  const taken = Object.fromEntries((avail as Availability[]).map((a) => [a.ticket_type_id, a.taken]));
  for (const t of types) {
    if (t.quota < (taken[t.id] ?? 0)) {
      return NextResponse.json({ error: `${t.name}: Kontingent ${t.quota} liegt unter den bereits vergebenen ${taken[t.id]} Plätzen.` }, { status: 409 });
    }
  }
  const totalTaken = Object.values(taken).reduce((a, b) => a + b, 0);
  if (settings.total_capacity < totalTaken) {
    return NextResponse.json({ error: `Gesamtkapazität ${settings.total_capacity} liegt unter den bereits vergebenen ${totalTaken} Plätzen.` }, { status: 409 });
  }

  const { error: sErr } = await db().from("settings").update(settings).eq("id", true);
  if (sErr) return NextResponse.json({ error: sErr.message }, { status: 500 });
  for (const t of types) {
    const { id, ...rest } = t;
    const { error } = await db().from("ticket_types").update(rest).eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ message: "Gespeichert. Die öffentliche Seite zeigt die neuen Werte sofort." });
}
