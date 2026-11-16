import { NextResponse } from "next/server";
import { db } from "@/lib/supabase";
import { requireAdminApi } from "@/lib/admin-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const denied = await requireAdminApi();
  if (denied) return denied;

  const { data: order } = await db().from("orders").select("id, status").eq("id", params.id).maybeSingle();
  if (!order) return NextResponse.json({ error: "Bestellung nicht gefunden" }, { status: 404 });
  if (!["paid", "pending"].includes(order.status)) {
    return NextResponse.json({ error: "Bestellung ist bereits beendet" }, { status: 409 });
  }

  const now = new Date().toISOString();
  const { error } = await db().from("orders").update({ status: "cancelled", cancelled_at: now, reserved_until: null }).eq("id", order.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  await db().from("tickets").update({ status: "cancelled" }).eq("order_id", order.id);
  return NextResponse.json({ message: "Bestellung storniert, Tickets ungültig." });
}
