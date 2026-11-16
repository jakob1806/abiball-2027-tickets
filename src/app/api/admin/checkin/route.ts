import { NextResponse } from "next/server";
import { db } from "@/lib/supabase";
import { requireAdminApi } from "@/lib/admin-auth";
import { ticketTypeMap } from "@/lib/orders";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const denied = await requireAdminApi();
  if (denied) return denied;
  const { code } = (await req.json().catch(() => ({}))) as { code?: string };
  if (!code || typeof code !== "string" || code.length > 64) {
    return NextResponse.json({ error: "Kein Code" }, { status: 400 });
  }

  // QR-Codes enthalten nur den Code; falls jemand die Ticket-URL scannt, Code extrahieren
  const match = code.toUpperCase().match(/WG27-?[A-Z0-9]{4}-?[A-Z0-9]{4}-?[A-Z0-9]{4}/);
  let normalized = match ? match[0] : code;
  const raw = normalized.replace(/[^A-Z0-9]/gi, "").toUpperCase();
  if (/^WG27[A-Z0-9]{12}$/.test(raw)) normalized = `WG27-${raw.slice(4, 8)}-${raw.slice(8, 12)}-${raw.slice(12, 16)}`;

  const { data, error } = await db().rpc("check_in", { p_code: normalized });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const row = (data as Record<string, string | null>[])[0];
  const types = await ticketTypeMap();
  return NextResponse.json({ ...row, ticket_type_name: row?.ticket_type_id ? types[row.ticket_type_id]?.name : null });
}

/** Live-Zähler für den Scanner: eingecheckt / gültige Tickets. */
export async function GET() {
  const denied = await requireAdminApi();
  if (denied) return denied;
  const { data, error } = await db()
    .from("tickets")
    .select("checked_in_at, orders!inner(status)")
    .eq("status", "valid")
    .eq("orders.status", "paid");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const rows = data as unknown as { checked_in_at: string | null }[];
  return NextResponse.json({ inside: rows.filter((r) => r.checked_in_at).length, total: rows.length });
}
