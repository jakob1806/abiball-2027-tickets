import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/supabase";
import { requireAdminApi } from "@/lib/admin-auth";
import { AGE_GROUP_IDS } from "@/lib/event";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({
  buyer_name: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(200),
  relation: z.enum(["abiturient", "gast"]),
  guest_of: z.string().trim().max(120).nullable(),
  notes: z.string().trim().max(500).nullable(),
  tickets: z
    .array(z.object({ id: z.string().uuid(), holder_name: z.string().trim().min(2).max(120), age_group: z.enum(AGE_GROUP_IDS).nullable().optional() }))
    .max(20),
});

/** Stammdaten einer Bestellung und Ticketinhaber korrigieren. */
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const denied = await requireAdminApi();
  if (denied) return denied;

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Ungültige Eingabe" }, { status: 400 });
  const v = parsed.data;
  if (v.relation === "gast" && !v.guest_of) return NextResponse.json({ error: "Bitte „Gast von“ angeben." }, { status: 400 });

  const { error } = await db()
    .from("orders")
    .update({
      buyer_name: v.buyer_name,
      email: v.email.toLowerCase(),
      relation: v.relation,
      guest_of: v.relation === "gast" ? v.guest_of : null,
      notes: v.notes || null,
    })
    .eq("id", params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  for (const t of v.tickets) {
    const { error: tErr } = await db().from("tickets").update({ holder_name: t.holder_name, ...(t.age_group !== undefined ? { age_group: t.age_group } : {}) }).eq("id", t.id).eq("order_id", params.id);
    if (tErr) return NextResponse.json({ error: tErr.message }, { status: 500 });
  }
  return NextResponse.json({ message: "Gespeichert. Bei geänderter E-Mail oder Namen ggf. „Mail erneut senden“." });
}

/** Abgelaufene oder unbezahlt stornierte Buchung endgültig löschen. */
export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const denied = await requireAdminApi();
  if (denied) return denied;
  const { data: o } = await db().from("orders").select("id, status, paid_at").eq("id", params.id).maybeSingle();
  if (!o) return NextResponse.json({ error: "Bestellung nicht gefunden" }, { status: 404 });
  if (o.paid_at || !["expired", "cancelled"].includes(o.status)) {
    return NextResponse.json({ error: "Nur abgelaufene oder unbezahlte stornierte Buchungen können gelöscht werden." }, { status: 409 });
  }
  const { error } = await db().from("orders").delete().eq("id", o.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ message: "Buchung gelöscht." });
}
