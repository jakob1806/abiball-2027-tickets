import { NextResponse } from "next/server";
import { db } from "@/lib/supabase";
import { requireScanner } from "@/lib/scanner-api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Gästeliste für den Einlass: ?status=missing|in|all&q=Name oder Nummer */
export async function GET(req: Request) {
  const { denied } = await requireScanner(req);
  if (denied) return denied;
  const url = new URL(req.url);
  const status = url.searchParams.get("status") ?? "missing";
  const q = (url.searchParams.get("q") ?? "").trim().toLowerCase();

  let query = db()
    .from("tickets")
    .select("id, ticket_number, holder_name, ticket_type_id, checked_in_at, checked_in_by_label, orders!inner(status)")
    .eq("status", "valid")
    .eq("orders.status", "paid");
  if (status === "missing") query = query.is("checked_in_at", null);
  if (status === "in") query = query.not("checked_in_at", "is", null);
  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const guests = (data as unknown as {
    id: string; ticket_number: string | null; holder_name: string; ticket_type_id: string; checked_in_at: string | null; checked_in_by_label: string | null;
  }[])
    .filter((g) => !q || g.holder_name.toLowerCase().includes(q) || (g.ticket_number ?? "").toLowerCase().includes(q))
    .sort((a, b) => a.holder_name.localeCompare(b.holder_name, "de"))
    .map(({ id, ticket_number, holder_name, ticket_type_id, checked_in_at, checked_in_by_label }) => ({
      id, ticket_number, holder_name, ticket_type_id, checked_in_at, checked_in_by_label,
    }));
  return NextResponse.json({ count: guests.length, guests });
}
