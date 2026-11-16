export type OrderStatus = "pending" | "paid" | "expired" | "cancelled" | "refunded";
export type PaymentMethod = "stripe" | "bar" | "ueberweisung" | "frei" | "abendkasse";

export interface TicketType {
  id: string;
  name: string;
  description: string;
  admission: string;
  price_cents: number;
  quota: number;
  number_prefix: string;
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
  ticket_number: string | null;
  holder_name: string;
  /** Altersgruppe am Tag des Abiballs: u16, u18 (16–17), a18 (18+). Null bei Altbestellungen. */
  age_group: string | null;
  status: "valid" | "cancelled";
  checked_in_at: string | null;
  checked_in_by_label: string | null;
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
  age_groups: string[];
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
  transfer_reference: string | null;
  transfer_due_at: string | null;
  transfer_reminder_sent_at: string | null;
  notes: string | null;
  created_at: string;
}

export interface OrderWithDetails extends Order {
  order_items: OrderItem[];
  tickets: Ticket[];
}
