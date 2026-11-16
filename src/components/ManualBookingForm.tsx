"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface T { id: string; name: string; price_cents: number; available: number }
const euro = (c: number) => new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(c / 100);

export default function ManualBookingForm({ types, maxPerOrder }: { types: T[]; maxPerOrder: number }) {
  const router = useRouter();
  const [qty, setQty] = useState<Record<string, number>>(Object.fromEntries(types.map((t) => [t.id, 0])));
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [relation, setRelation] = useState<"abiturient" | "gast">("abiturient");
  const [guestOf, setGuestOf] = useState("");
  const [guests, setGuests] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"bar" | "ueberweisung" | "frei">("bar");
  const [notes, setNotes] = useState("");
  const [sendMail, setSendMail] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const total = Object.values(qty).reduce((a, b) => a + b, 0);
  const sum = paymentMethod === "frei" ? 0 : types.reduce((s, t) => s + t.price_cents * (qty[t.id] ?? 0), 0);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (total < 1) return setError("Mindestens ein Ticket wählen.");
    if (total > maxPerOrder) return setError(`Höchstens ${maxPerOrder} Tickets.`);
    setBusy(true);
    setError(null);
    const res = await fetch("/api/admin/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        items: Object.entries(qty).filter(([, q]) => q > 0).map(([ticket_type_id, quantity]) => ({ ticket_type_id, quantity })),
        name,
        email,
        relation,
        guestOf: relation === "gast" ? guestOf : null,
        guestNames: guests.split(/\n|,/).map((g) => g.trim()).filter(Boolean),
        paymentMethod,
        notes,
        sendMail,
      }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) return setError(data.error ?? "Fehler");
    if (data.mailError) window.alert(`Buchung angelegt, aber Mail fehlgeschlagen: ${data.mailError}`);
    router.push(`/admin/bestellung/${data.id}`);
  }

  return (
    <form className="form" onSubmit={submit}>
      <div className="tickets">
        {types.map((t) => (
          <div className="ticket-row" key={t.id}>
            <div><strong>{t.name}</strong><div className="small muted">{t.available} frei</div></div>
            <div className="price">{euro(t.price_cents)}</div>
            <input
              type="number"
              min={0}
              max={Math.min(maxPerOrder, t.available)}
              value={qty[t.id]}
              onChange={(e) => setQty({ ...qty, [t.id]: Math.max(0, Number(e.target.value) || 0) })}
              style={{ width: 90 }}
              aria-label={`Anzahl ${t.name}`}
            />
          </div>
        ))}
      </div>
      <div className="grid-2">
        <label className="field">Name<input type="text" required value={name} onChange={(e) => setName(e.target.value)} /></label>
        <label className="field">E-Mail<input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></label>
      </div>
      <div className="grid-2">
        <label className="field">
          Bezug
          <select value={relation} onChange={(e) => setRelation(e.target.value as "abiturient" | "gast")}>
            <option value="abiturient">Abiturient/in</option>
            <option value="gast">Gast von …</option>
          </select>
        </label>
        {relation === "gast" && (
          <label className="field">Gast von<input type="text" required value={guestOf} onChange={(e) => setGuestOf(e.target.value)} /></label>
        )}
      </div>
      <label className="field">
        Namen weiterer Gäste (eine Zeile pro Person)
        <textarea rows={3} value={guests} onChange={(e) => setGuests(e.target.value)} />
      </label>
      <div className="grid-2">
        <label className="field">
          Zahlungsart
          <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value as "bar" | "ueberweisung" | "frei")}>
            <option value="bar">Bar</option>
            <option value="ueberweisung">Überweisung</option>
            <option value="frei">Frei (0 €)</option>
          </select>
        </label>
        <label className="field">Notiz (intern)<input type="text" value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={500} /></label>
      </div>
      <label className="check">
        <input type="checkbox" checked={sendMail} onChange={(e) => setSendMail(e.target.checked)} />
        <span>Tickets per E-Mail senden</span>
      </label>
      <div className="summary"><span>{total} Tickets</span><strong>{euro(sum)}</strong></div>
      {error && <div className="alert">{error}</div>}
      <button className="btn block" disabled={busy}>{busy ? "Lege an …" : "Buchung anlegen"}</button>
    </form>
  );
}
