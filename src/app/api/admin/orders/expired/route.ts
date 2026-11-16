import { NextResponse } from "next/server";
import { db } from "@/lib/supabase";
import { requireAdminApi } from "@/lib/admin-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Alle abgelaufenen (nie bezahlten) Buchungen endgültig löschen. */
export async function DELETE() {
  const denied = await requireAdminApi();
  if (denied) return denied;
  const { data, error } = await db().from("orders").delete().eq("status", "expired").is("paid_at", null).select("id");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ message: `${data?.length ?? 0} abgelaufene Buchungen gelöscht.` });
}
