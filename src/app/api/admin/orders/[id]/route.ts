import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/supabase";
import { requireAdminApi } from "@/lib/admin-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({
  buyer_name: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(200),
  relation: z.enum(["abiturient", "gast"]),
  guest_of: z.string().trim().max(120).nullable(),
  notes: z.string().trim().max(500).nullable(),
  tickets: z.array(z.object({ id: z.string().uuid(), holder_name: z.string().trim().min(2).max(120) })).max(20),
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
    const { error: tErr } = await db().from("tickets").update({ holder_name: t.holder_name }).eq("id", t.id).eq("order_id", params.id);
    if (tErr) return NextResponse.json({ error: tErr.message }, { status: 500 });
  }
  return NextResponse.json({ message: "Gespeichert. Bei geänderter E-Mail oder Namen ggf. „Mail erneut senden“." });
}
