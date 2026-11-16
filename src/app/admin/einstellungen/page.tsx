import SettingsForm from "@/components/SettingsForm";
import { db } from "@/lib/supabase";
import { getAvailability, getTicketTypes } from "@/lib/orders";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const [types, avail, { data: settings }] = await Promise.all([
    getTicketTypes(false),
    getAvailability(),
    db().from("settings").select("total_capacity, max_per_order, sales_open, prices_final").single(),
  ]);
  return (
    <main className="wrap narrow" style={{ paddingTop: 32, paddingBottom: 64 }}>
      <h1 className="h2">Einstellungen</h1>
      <p className="muted">Änderungen gelten sofort für neue Bestellungen. Bereits bezahlte Tickets bleiben unverändert.</p>
      <SettingsForm
        initialSettings={settings ?? { total_capacity: 350, max_per_order: 8, sales_open: true, prices_final: false }}
        initialTypes={types.map((t) => ({ ...t, free: avail.perType[t.id] ?? 0 }))}
      />
    </main>
  );
}
