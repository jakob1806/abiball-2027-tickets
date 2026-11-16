import "server-only";
import { db } from "./supabase";
import { getAvailability } from "./orders";
import type { OrderWithDetails } from "./types";

export interface DailyPoint {
  day: string; // YYYY-MM-DD (Europe/Berlin)
  tickets: number;
  cents: number;
}

function berlinDay(iso: string): string {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Berlin" }).format(new Date(iso));
}

export async function getStats() {
  const [avail, paidOrders, tickets, pending, recent, queue] = await Promise.all([
    getAvailability(),
    db().from("orders").select("amount_cents, payment_method, paid_at, order_items(quantity)").eq("status", "paid"),
    db().from("tickets").select("ticket_type_id, checked_in_at, orders!inner(status)").eq("status", "valid").eq("orders.status", "paid"),
    db().from("orders").select("id, order_items(quantity)").eq("status", "pending").gt("reserved_until", new Date().toISOString()),
    db().from("orders").select("*, order_items(*), tickets(*)").order("created_at", { ascending: false }).limit(8),
    db().from("orders").select("id", { count: "exact", head: true }).eq("status", "paid").is("mail_sent_at", null).not("mail_queued_at", "is", null),
  ]);
  for (const r of [paidOrders, tickets, pending, recent]) if (r.error) throw r.error;

  const rows = tickets.data as unknown as { ticket_type_id: string; checked_in_at: string | null }[];
  const perType: Record<string, { sold: number; checkedIn: number }> = {};
  for (const t of rows) {
    perType[t.ticket_type_id] ??= { sold: 0, checkedIn: 0 };
    perType[t.ticket_type_id].sold += 1;
    if (t.checked_in_at) perType[t.ticket_type_id].checkedIn += 1;
  }

  type Paid = { amount_cents: number; payment_method: string; paid_at: string | null; order_items: { quantity: number }[] };
  const paid = (paidOrders.data ?? []) as Paid[];
  const qty = (o: { order_items: { quantity: number }[] }) => o.order_items.reduce((a, i) => a + i.quantity, 0);

  const byPayment: Record<string, { orders: number; tickets: number; cents: number }> = {};
  const daily = new Map<string, DailyPoint>();
  for (const o of paid) {
    byPayment[o.payment_method] ??= { orders: 0, tickets: 0, cents: 0 };
    byPayment[o.payment_method].orders += 1;
    byPayment[o.payment_method].tickets += qty(o);
    byPayment[o.payment_method].cents += o.amount_cents;
    if (o.paid_at) {
      const d = berlinDay(o.paid_at);
      const p = daily.get(d) ?? { day: d, tickets: 0, cents: 0 };
      p.tickets += qty(o);
      p.cents += o.amount_cents;
      daily.set(d, p);
    }
  }

  // Letzte 30 Tage lückenlos
  const days: DailyPoint[] = [];
  for (let i = 29; i >= 0; i--) {
    const d = berlinDay(new Date(Date.now() - i * 86400000).toISOString());
    days.push(daily.get(d) ?? { day: d, tickets: 0, cents: 0 });
  }

  const revenue = paid.reduce((s, o) => s + o.amount_cents, 0);
  return {
    sold: rows.length,
    checkedIn: rows.filter((t) => t.checked_in_at).length,
    revenue,
    revenueOnline: byPayment.stripe?.cents ?? 0,
    paidOrders: paid.length,
    reservedTickets: ((pending.data ?? []) as { order_items: { quantity: number }[] }[]).reduce((s, o) => s + qty(o), 0),
    remaining: avail.totalLeft,
    capacity: avail.totalCapacity,
    salesOpen: avail.salesOpen,
    perTypeAvailable: avail.perType,
    perType,
    byPayment,
    days,
    recent: recent.data as OrderWithDetails[],
    mailQueue: queue.count ?? 0,
  };
}

/** Alle gültigen Tickets bezahlter Bestellungen – für Gästeliste und Abiturienten-Übersicht. */
export async function getGuestList() {
  const { data, error } = await db()
    .from("tickets")
    .select("id, code, holder_name, ticket_type_id, checked_in_at, orders!inner(id, buyer_name, email, relation, guest_of, status)")
    .eq("status", "valid")
    .eq("orders.status", "paid");
  if (error) throw error;
  type Row = {
    id: string;
    code: string;
    holder_name: string;
    ticket_type_id: string;
    checked_in_at: string | null;
    orders: { id: string; buyer_name: string; email: string; relation: string; guest_of: string | null; status: string };
  };
  return (data as unknown as Row[]).sort((a, b) => a.holder_name.localeCompare(b.holder_name, "de"));
}

export interface OrderFilter {
  q?: string;
  status?: string;
  type?: string;
  zahlung?: string;
}

export async function listOrders(filter: OrderFilter): Promise<OrderWithDetails[]> {
  let query = db()
    .from("orders")
    .select("*, order_items(*), tickets(*)")
    .order("created_at", { ascending: false })
    .limit(2000);

  if (filter.status) query = query.eq("status", filter.status);
  if (filter.zahlung) query = query.eq("payment_method", filter.zahlung);

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
