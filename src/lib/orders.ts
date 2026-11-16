import "server-only";
import { db } from "./supabase";
import type { Order, OrderWithDetails, Ticket, TicketType } from "./types";

export async function getTicketTypes(onlyActive = true): Promise<TicketType[]> {
  let q = db().from("ticket_types").select("*").order("sort");
  if (onlyActive) q = q.eq("active", true);
  const { data, error } = await q;
  if (error) throw error;
  return data as TicketType[];
}

export async function ticketTypeMap(): Promise<Record<string, TicketType>> {
  const types = await getTicketTypes(false);
  return Object.fromEntries(types.map((t) => [t.id, t]));
}

export interface Availability {
  ticket_type_id: string;
  quota: number;
  taken: number;
}

export async function getAvailability(): Promise<{
  perType: Record<string, number>;
  totalLeft: number;
  totalCapacity: number;
  maxPerOrder: number;
  salesOpen: boolean;
}> {
  const [{ data: avail, error: e1 }, { data: settings, error: e2 }] = await Promise.all([
    db().rpc("ticket_availability"),
    db().from("settings").select("*").single(),
  ]);
  if (e1) throw e1;
  if (e2) throw e2;
  const rows = (avail ?? []) as Availability[];
  const takenTotal = rows.reduce((s, r) => s + r.taken, 0);
  const totalLeft = Math.max(0, settings.total_capacity - takenTotal);
  const perType = Object.fromEntries(
    rows.map((r) => [r.ticket_type_id, Math.max(0, Math.min(r.quota - r.taken, totalLeft))]),
  );
  return {
    perType,
    totalLeft,
    totalCapacity: settings.total_capacity,
    maxPerOrder: settings.max_per_order,
    salesOpen: settings.sales_open,
  };
}

const DETAILS = "*, order_items(*), tickets(*)";

export async function getOrderByToken(token: string): Promise<OrderWithDetails | null> {
  if (!/^[a-f0-9]{48}$/.test(token)) return null;
  const { data, error } = await db().from("orders").select(DETAILS).eq("public_token", token).maybeSingle();
  if (error) throw error;
  return sortTickets(data as OrderWithDetails | null);
}

export async function getOrderById(id: string): Promise<OrderWithDetails | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const { data, error } = await db().from("orders").select(DETAILS).eq("id", id).maybeSingle();
  if (error) throw error;
  return sortTickets(data as OrderWithDetails | null);
}

export async function getTicketByCode(code: string): Promise<{ ticket: Ticket; order: Order } | null> {
  const normalized = code.trim().toUpperCase();
  if (!/^WG27-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(normalized)) return null;
  const { data, error } = await db().from("tickets").select("*, orders(*)").eq("code", normalized).maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const { orders, ...ticket } = data as Ticket & { orders: Order };
  return { ticket: ticket as Ticket, order: orders };
}

function sortTickets(order: OrderWithDetails | null): OrderWithDetails | null {
  if (!order) return null;
  order.tickets = [...(order.tickets ?? [])].sort((a, b) => a.created_at.localeCompare(b.created_at) || a.code.localeCompare(b.code));
  return order;
}

/** Übersetzt Fehler aus den SQL-Funktionen in verständliche Meldungen. */
export function reservationErrorMessage(message: string): string {
  if (message.includes("SOLD_OUT")) return "Leider sind nicht mehr genügend Plätze für diese Auswahl frei.";
  if (message.includes("MAX_PER_ORDER")) return "Pro Bestellung sind nicht so viele Tickets möglich.";
  if (message.includes("EMPTY_ORDER")) return "Bitte wähle mindestens ein Ticket.";
  if (message.includes("SALES_CLOSED")) return "Der Ticketverkauf ist derzeit geschlossen.";
  if (message.includes("UNKNOWN_TICKET_TYPE")) return "Diese Ticketart ist nicht verfügbar.";
  return "Die Reservierung ist fehlgeschlagen. Bitte versuche es erneut.";
}
