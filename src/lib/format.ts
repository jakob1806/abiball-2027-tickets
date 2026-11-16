import type { OrderStatus, PaymentMethod } from "./types";

export function euro(cents: number): string {
  return new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(cents / 100);
}

export function dateTime(iso: string | null | undefined): string {
  if (!iso) return "–";
  return new Intl.DateTimeFormat("de-DE", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "Europe/Berlin",
  }).format(new Date(iso));
}

export const STATUS_LABEL: Record<OrderStatus, string> = {
  pending: "Offen",
  paid: "Bezahlt",
  expired: "Abgelaufen",
  cancelled: "Storniert",
  refunded: "Erstattet",
};

export const PAYMENT_LABEL: Record<PaymentMethod, string> = {
  stripe: "Online (Stripe)",
  bar: "Bar",
  ueberweisung: "Überweisung",
  frei: "Freiticket",
};

export function relationLabel(relation: string, guestOf: string | null): string {
  return relation === "abiturient" ? "Abiturient/in" : `Gast von ${guestOf ?? "–"}`;
}
