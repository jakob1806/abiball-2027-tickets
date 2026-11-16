export type OrderStatus = "pending" | "paid" | "expired" | "cancelled" | "refunded";
export type PaymentMethod = "stripe" | "bar" | "ueberweisung" | "frei";

export interface TicketType {
  id: string;
  name: string;
  description: string;
  admission: string;
  price_cents: number;
  quota: number;
  sort: number;
  active: boolean;
}

export interface OrderItem {
  order_id: string;
  ticket_type_id: string;
  quantity: number;
  unit_price_cents: number;
}

export interface Ticket {
  id: string;
  order_id: string;
  ticket_type_id: string;
  code: string;
  holder_name: string;
  status: "valid" | "cancelled";
  checked_in_at: string | null;
  created_at: string;
}

export interface Order {
  id: string;
  public_token: string;
  status: OrderStatus;
  buyer_name: string;
  email: string;
  relation: "abiturient" | "gast";
  guest_of: string | null;
  guest_names: string[];
  youth_protection_ack: boolean;
  terms_ack: boolean;
  payment_method: PaymentMethod;
  amount_cents: number;
  stripe_session_id: string | null;
  stripe_payment_intent: string | null;
  reserved_until: string | null;
  paid_at: string | null;
  cancelled_at: string | null;
  refunded_at: string | null;
  mail_sent_at: string | null;
  mail_queued_at: string | null;
  mail_attempts: number;
  mail_last_error: string | null;
  notes: string | null;
  created_at: string;
}

export interface OrderWithDetails extends Order {
  order_items: OrderItem[];
  tickets: Ticket[];
}
