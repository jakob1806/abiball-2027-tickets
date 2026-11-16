import "server-only";
import { db } from "./supabase";
import { ticketTypeMap } from "./orders";

export interface CheckinResult {
  result: "ok" | "duplicate" | "invalid" | "cancelled";
  ticket_id: string | null;
  code: string;
  holder_name: string | null;
  ticket_type_id: string | null;
  ticket_type_name: string | null;
  ticket_number: string | null;
  checked_in_at: string | null;
  checked_in_by_label: string | null;
  /** Altersgruppe (u16, u18, a18) für die Bändchenfarbe; null bei Altbestellungen */
  age_group: string | null;
}

/** Normalisiert gescannten Text (auch Ticket-URLs) auf WG27-XXXX-XXXX-XXXX. */
export function normalizeCode(raw: string): string {
  const match = raw.toUpperCase().match(/WG27-?[A-Z0-9]{4}-?[A-Z0-9]{4}-?[A-Z0-9]{4}/);
  const compact = (match ? match[0] : raw).replace(/[^A-Z0-9]/gi, "").toUpperCase();
  return /^WG27[A-Z0-9]{12}$/.test(compact)
    ? `WG27-${compact.slice(4, 8)}-${compact.slice(8, 12)}-${compact.slice(12, 16)}`
    : raw.trim().toUpperCase();
}

export async function performCheckin(rawCode: string, scanner: { id: string | null; label: string }): Promise<CheckinResult> {
  const { data, error } = await db().rpc("check_in", { p_code: normalizeCode(rawCode), p_scanner_id: scanner.id, p_label: scanner.label });
  if (error) throw error;
  const row = (data as Omit<CheckinResult, "ticket_type_name">[])[0];
  const types = await ticketTypeMap();
  return { ...row, ticket_type_name: row?.ticket_type_id ? types[row.ticket_type_id]?.name ?? null : null };
}

export async function checkinStats() {
  const [{ data: tickets, error }, { data: settings }] = await Promise.all([
    db().from("tickets").select("ticket_type_id, checked_in_at, orders!inner(status)").eq("status", "valid").eq("orders.status", "paid"),
    db().from("settings").select("total_capacity").single(),
  ]);
  if (error) throw error;
  const rows = tickets as unknown as { ticket_type_id: string; checked_in_at: string | null }[];
  const types = await ticketTypeMap();
  const perType = Object.values(types)
    .sort((a, b) => a.sort - b.sort)
    .map((t) => {
      const r = rows.filter((x) => x.ticket_type_id === t.id);
      return { id: t.id, name: t.name, prefix: t.number_prefix, sold: r.length, inside: r.filter((x) => x.checked_in_at).length };
    });
  const inside = rows.filter((r) => r.checked_in_at).length;
  return {
    capacity: settings?.total_capacity ?? 350,
    sold: rows.length,
    inside,
    missing: rows.length - inside,
    perType,
    updatedAt: new Date().toISOString(),
  };
}
