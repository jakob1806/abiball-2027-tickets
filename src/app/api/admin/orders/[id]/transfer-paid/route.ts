import { NextResponse } from "next/server";
import { db } from "@/lib/supabase";
import { requireAdminApi } from "@/lib/admin-auth";
import { markTransferPaid } from "@/lib/transfer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Admin bestätigt den Zahlungseingang einer Überweisung → Tickets + Mail. */
export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const denied = await requireAdminApi();
  if (denied) return denied;
  const { data: o } = await db().from("orders").select("id, status, payment_method").eq("id", params.id).maybeSingle();
  if (!o) return NextResponse.json({ error: "Bestellung nicht gefunden" }, { status: 404 });
  if (o.payment_method !== "ueberweisung" || !["pending", "expired"].includes(o.status)) {
    return NextResponse.json({ error: "Keine offene Überweisung" }, { status: 409 });
  }
  try {
    const r = await markTransferPaid(o.id);
    const extra = o.status === "expired" ? " Achtung: Die Bestellung war schon abgelaufen – bitte prüfen, ob die Kapazität noch passt." : "";
    return NextResponse.json({
      message: (r.status === "sent" ? "Zahlung bestätigt, Tickets verschickt." : "Zahlung bestätigt, Tickets erzeugt. Die Mail liegt in der Warteschlange.") + extra,
    });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Fehler" }, { status: 500 });
  }
}
