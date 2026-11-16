"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { TicketType } from "@/lib/types";

type T = TicketType & { free: number };
interface S {
  total_capacity: number;
  max_per_order: number;
  sales_open: boolean;
  prices_final: boolean;
  bank_transfer_enabled: boolean;
  bank_account_holder: string;
  bank_iban: string;
  bank_bic: string;
  bank_name: string;
  transfer_days: number;
}

const toEuro = (c: number) => (c / 100).toFixed(2).replace(".", ",");
const toCents = (s: string) => Math.round(Number(s.replace(/\./g, "").replace(",", ".")) * 100);

export default function SettingsForm({ initialSettings, initialTypes }: { initialSettings: S; initialTypes: T[] }) {
  const router = useRouter();
  const [s, setS] = useState(initialSettings);
  const [types, setTypes] = useState(initialTypes.map((t) => ({ ...t, priceText: toEuro(t.price_cents) })));
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const quotaSum = types.filter((t) => t.active).reduce((a, t) => a + t.quota, 0);

  function upd(i: number, patch: Partial<(typeof types)[number]>) {
    setTypes((ts) => ts.map((t, j) => (j === i ? { ...t, ...patch } : t)));
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    for (const t of types) {
      if (!Number.isFinite(toCents(t.priceText))) return setMsg({ ok: false, text: `${t.name}: ungültiger Preis.` });
    }
    setBusy(true);
    setMsg(null);
    const res = await fetch("/api/admin/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        settings: s,
        types: types.map((t) => ({
          id: t.id, name: t.name, description: t.description, admission: t.admission,
          price_cents: toCents(t.priceText), quota: t.quota, active: t.active,
        })),
      }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    setMsg(res.ok ? { ok: true, text: data.message } : { ok: false, text: data.error ?? "Fehler" });
    if (res.ok) router.refresh();
  }

  return (
    <form className="form" onSubmit={save}>
      <section className="panel form">
        <h2 className="h3" style={{ margin: 0 }}>Verkauf</h2>
        <label className="check">
          <input type="checkbox" checked={s.sales_open} onChange={(e) => setS({ ...s, sales_open: e.target.checked })} />
          <span><strong>Ticketverkauf geöffnet</strong><br /><span className="muted small">Wenn aus, zeigt die Seite „Verkauf geschlossen“. Manuelle Buchungen im Admin gehen weiterhin.</span></span>
        </label>
        <label className="check">
          <input type="checkbox" checked={s.prices_final} onChange={(e) => setS({ ...s, prices_final: e.target.checked })} />
          <span><strong>Preise sind final</strong><br /><span className="muted small">Wenn aus, stehen die Preise auf der Seite in Klammern mit dem Hinweis „Platzhalter“. Abgerechnet wird trotzdem der eingetragene Preis.</span></span>
        </label>
        <div className="grid-2">
          <label className="field">
            Gesamtkapazität
            <input type="number" min={1} value={s.total_capacity} onChange={(e) => setS({ ...s, total_capacity: Number(e.target.value) })} />
          </label>
          <label className="field">
            Max. Tickets pro Bestellung
            <input type="number" min={1} max={20} value={s.max_per_order} onChange={(e) => setS({ ...s, max_per_order: Number(e.target.value) })} />
          </label>
        </div>
        {quotaSum > s.total_capacity && (
          <p className="small muted" style={{ margin: 0 }}>
            Hinweis: Die Kontingente ergeben zusammen {quotaSum}, die Gesamtkapazität ({s.total_capacity}) begrenzt zusätzlich. Das ist so gewollt möglich.
          </p>
        )}
      </section>

      <section className="panel form">
        <h2 className="h3" style={{ margin: 0 }}>Überweisung (Vorkasse)</h2>
        <label className="check">
          <input type="checkbox" checked={s.bank_transfer_enabled} onChange={(e) => setS({ ...s, bank_transfer_enabled: e.target.checked })} />
          <span><strong>Überweisung als Zahlungsart anbieten</strong><br /><span className="muted small">Erscheint als zweite Option unter Karte, Apple Pay und Google Pay. Tickets gibt es erst, wenn hier „Zahlung eingegangen“ bestätigt wird. Ohne Zahlung wird nach der Frist automatisch storniert und der Käufer per Mail informiert.</span></span>
        </label>
        <div className="grid-2">
          <label className="field">Kontoinhaber<input type="text" value={s.bank_account_holder} onChange={(e) => setS({ ...s, bank_account_holder: e.target.value })} maxLength={70} /></label>
          <label className="field">IBAN<input type="text" value={s.bank_iban} onChange={(e) => setS({ ...s, bank_iban: e.target.value })} autoComplete="off" maxLength={42} /></label>
        </div>
        <div className="grid-2">
          <label className="field">BIC (optional)<input type="text" value={s.bank_bic} onChange={(e) => setS({ ...s, bank_bic: e.target.value })} maxLength={11} /></label>
          <label className="field">Bank (optional)<input type="text" value={s.bank_name} onChange={(e) => setS({ ...s, bank_name: e.target.value })} maxLength={80} /></label>
        </div>
        <label className="field" style={{ maxWidth: 260 }}>
          Zahlungsfrist in Tagen
          <input type="number" min={2} max={30} value={s.transfer_days} onChange={(e) => setS({ ...s, transfer_days: Number(e.target.value) })} />
        </label>
        <p className="small muted" style={{ margin: 0 }}>Erinnerung geht automatisch 2 Tage vor Ablauf raus. Prüft eure Kontoauszüge regelmäßig auf den Verwendungszweck (ABI27-…).</p>
      </section>

      {types.map((t, i) => (
        <section className="panel form" key={t.id}>
          <div className="meter-label" style={{ margin: 0 }}>
            <h2 className="h3" style={{ margin: 0 }}>{t.name}</h2>
            <span className="small muted">{t.free} frei</span>
          </div>
          <div className="grid-2">
            <label className="field">Name<input type="text" required value={t.name} onChange={(e) => upd(i, { name: e.target.value })} /></label>
            <label className="field">Einlass<input type="text" required value={t.admission} onChange={(e) => upd(i, { admission: e.target.value })} /></label>
          </div>
          <label className="field">Beschreibung<input type="text" value={t.description} onChange={(e) => upd(i, { description: e.target.value })} /></label>
          <div className="grid-2">
            <label className="field">Preis in €<input type="text" inputMode="decimal" required value={t.priceText} onChange={(e) => upd(i, { priceText: e.target.value })} /></label>
            <label className="field">Kontingent<input type="number" min={0} required value={t.quota} onChange={(e) => upd(i, { quota: Number(e.target.value) })} /></label>
          </div>
          <label className="check">
            <input type="checkbox" checked={t.active} onChange={(e) => upd(i, { active: e.target.checked })} />
            <span>Auf der Seite anbieten</span>
          </label>
        </section>
      ))}

      {msg && <div className={msg.ok ? "note" : "alert"}>{msg.text}</div>}
      <button className="btn block" disabled={busy}>{busy ? "Speichere …" : "Speichern"}</button>
    </form>
  );
}
