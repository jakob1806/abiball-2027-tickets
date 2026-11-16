import ManualBookingForm from "@/components/ManualBookingForm";
import { getAvailability, getTicketTypes } from "@/lib/orders";

export const dynamic = "force-dynamic";

export default async function NewBooking() {
  const [types, avail] = await Promise.all([getTicketTypes(), getAvailability()]);
  return (
    <main className="wrap narrow" style={{ paddingTop: 32, paddingBottom: 64 }}>
      <h1 className="h2">Neue Buchung</h1>
      <p className="muted">Für Barzahlung, Überweisung oder Freitickets. Die Buchung gilt sofort als bezahlt, Kontingente werden geprüft.</p>
      <ManualBookingForm
        types={types.map((t) => ({ id: t.id, name: t.name, price_cents: t.price_cents, available: avail.perType[t.id] ?? 0 }))}
        maxPerOrder={avail.maxPerOrder}
      />
    </main>
  );
}
