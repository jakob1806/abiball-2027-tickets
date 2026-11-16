import "server-only";
import { db } from "./supabase";
import { getAvailability } from "./orders";
import type { OrderWithDetails } from "./types";

export async function getStats() {
  const [avail, paidOrders, tickets] = await Promise.all([
    getAvailability(),
    db().from("orders").select("amount_cents, payment_method").eq("status", "paid"),
    db().from("tickets").select("ticket_type_id, checked_in_at, orders!inner(status)").eq("status", "valid").eq("orders.status", "paid"),
  ]);
  if (paidOrders.error) throw paidOrders.error;
  if (tickets.error) throw tickets.error;

  const rows = tickets.data as unknown as { ticket_type_id: string; checked_in_at: string | null }[];
  const perType: Record<string, { sold: number; checkedIn: number }> = {};
  for (const t of rows) {
    perType[t.ticket_type_id] ??= { sold: 0, checkedIn: 0 };
    perType[t.ticket_type_id].sold += 1;
    if (t.checked_in_at) perType[t.ticket_type_id].checkedIn += 1;
  }
  const revenue = (paidOrders.data ?? []).reduce((s, o) => s + o.amount_cents, 0);
  const revenueOnline = (paidOrders.data ?? []).filter((o) => o.payment_method === "stripe").reduce((s, o) => s + o.amount_cents, 0);

  return {
    sold: rows.length,
    checkedIn: rows.filter((t) => t.checked_in_at).length,
    revenue,
    revenueOnline,
    remaining: avail.totalLeft,
    capacity: avail.totalCapacity,
    perTypeAvailable: avail.perType,
    perType,
  };
}

export interface OrderFilter {
  q?: string;
  status?: string;
  type?: string;
}

export async function listOrders(filter: OrderFilter): Promise<OrderWithDetails[]> {
  let query = db()
    .from("orders")
    .select("*, order_items(*), tickets(*)")
    .order("created_at", { ascending: false })
    .limit(2000);

  if (filter.status) query = query.eq("status", filter.status);

  const q = (filter.q ?? "").replace(/[,()%*\\]/g, " ").trim();
  if (q) {
    if (/^WG27-/i.test(q)) {
      const { data } = await db().from("tickets").select("order_id").ilike("code", `${q}%`);
      const ids = (data ?? []).map((t) => t.order_id);
      query = query.in("id", ids.length ? ids : ["00000000-0000-0000-0000-000000000000"]);
    } else {
      query = query.or(`buyer_name.ilike.%${q}%,email.ilike.%${q}%,guest_of.ilike.%${q}%`);
    }
  }

  const { data, error } = await query;
  if (error) throw error;
  let orders = data as OrderWithDetails[];
  if (filter.type) orders = orders.filter((o) => o.order_items.some((i) => i.ticket_type_id === filter.type));
  return orders;
}
