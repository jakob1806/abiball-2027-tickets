import { NextResponse } from "next/server";
import { db } from "@/lib/supabase";
import { requireAdminApi } from "@/lib/admin-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Manueller Einlass über die Gästeliste: abhaken oder wieder zurücknehmen. */
export async function POST(req: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const denied = await requireAdminApi();
  if (denied) return denied;
  const { checked } = (await req.json().catch(() => ({}))) as { checked?: boolean };
  if (typeof checked !== "boolean") return NextResponse.json({ error: "Ungültige Anfrage" }, { status: 400 });

  const { data: t } = await db().from("tickets").select("id, code, status, checked_in_at, orders!inner(status)").eq("id", params.id).maybeSingle();
  if (!t) return NextResponse.json({ error: "Ticket nicht gefunden" }, { status: 404 });
  const orderStatus = (t as unknown as { orders: { status: string } }).orders.status;
  if (t.status !== "valid" || orderStatus !== "paid") return NextResponse.json({ error: "Ticket ist nicht gültig" }, { status: 409 });

  const checkedInAt = checked ? t.checked_in_at ?? new Date().toISOString() : null;
  const { error } = await db()
    .from("tickets")
    .update({ checked_in_at: checkedInAt, checked_in_by: null, checked_in_by_label: checked ? "Admin (Liste)" : null })
    .eq("id", t.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (checked && !t.checked_in_at) await db().from("checkins").insert({ ticket_id: t.id, code: t.code, result: "ok", scanner_label: "Admin (Liste)" });
  return NextResponse.json({ checked_in_at: checkedInAt });
}
