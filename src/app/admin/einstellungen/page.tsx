import SettingsForm from "@/components/SettingsForm";
import WristbandForm from "@/components/WristbandForm";
import { getWristbands } from "@/lib/wristbands";
import { db } from "@/lib/supabase";
import { getAvailability, getTicketTypes } from "@/lib/orders";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const [types, avail, { data: settings }, wristbands] = await Promise.all([
    getTicketTypes(false),
    getAvailability(),
    db().from("settings").select("total_capacity, max_per_order, sales_open, prices_final, bank_transfer_enabled, bank_account_holder, bank_iban, bank_bic, bank_name, transfer_days").single(),
    getWristbands(),
  ]);
  return (
    <main className="wrap narrow" style={{ paddingTop: 32, paddingBottom: 64 }}>
      <h1 className="h2">Einstellungen</h1>
      <p className="muted">Änderungen gelten sofort für neue Bestellungen. Bereits bezahlte Tickets bleiben unverändert.</p>
      <SettingsForm
        initialSettings={{
          total_capacity: settings?.total_capacity ?? 350,
          max_per_order: settings?.max_per_order ?? 8,
          sales_open: settings?.sales_open ?? true,
          prices_final: settings?.prices_final ?? false,
          bank_transfer_enabled: settings?.bank_transfer_enabled ?? false,
          bank_account_holder: settings?.bank_account_holder ?? "",
          bank_iban: settings?.bank_iban ?? "",
          bank_bic: settings?.bank_bic ?? "",
          bank_name: settings?.bank_name ?? "",
          transfer_days: settings?.transfer_days ?? 7,
        }}
        initialTypes={types.map((t) => ({ ...t, free: avail.perType[t.id] ?? 0 }))}
      />
      <WristbandForm initial={wristbands} />
    </main>
  );
}
