import { NextResponse } from "next/server";
import { db } from "@/lib/supabase";
import { requireAdminApi } from "@/lib/admin-auth";
import { getBankDetails, sendTransferReminder } from "@/lib/transfer";
import type { Order } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(_req: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const denied = await requireAdminApi();
  if (denied) return denied;
  const { data } = await db().from("orders").select("*").eq("id", params.id).maybeSingle();
  const o = data as Order | null;
  if (!o || o.payment_method !== "ueberweisung" || o.status !== "pending") {
    return NextResponse.json({ error: "Keine offene Überweisung" }, { status: 409 });
  }
  try {
    await sendTransferReminder(o, await getBankDetails());
    await db().from("orders").update({ transfer_reminder_sent_at: new Date().toISOString() }).eq("id", o.id);
    return NextResponse.json({ message: "Erinnerung verschickt." });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Fehler" }, { status: 500 });
  }
}
