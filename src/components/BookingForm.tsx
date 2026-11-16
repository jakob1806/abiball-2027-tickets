"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { YOUTH_PROTECTION_TEXT } from "@/lib/event";
import AgeSelect, { AGE_HINT, MINOR_HINT } from "./AgeSelect";

export interface BookableType {
  id: string;
  name: string;
  description: string;
  admission: string;
  price_cents: number;
  available: number;
}

const euro = (c: number) => new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(c / 100);

export default function BookingForm({ types, maxPerOrder, salesOpen, preview = false, pricesFinal = true, transferDays = null }: { types: BookableType[]; maxPerOrder: number; salesOpen: boolean; preview?: boolean; pricesFinal?: boolean; transferDays?: number | null }) {
  const price = (c: number) => (pricesFinal ? euro(c) : `(${euro(c)})`);
  const [qty, setQty] = useState<Record<string, number>>(() => Object.fromEntries(types.map((t) => [t.id, 0])));
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [relation, setRelation] = useState<"abiturient" | "gast">("abiturient");
  const [guestOf, setGuestOf] = useState("");
  const [guests, setGuests] = useState<string[]>([]);
  // Index 0 = Besteller/in, danach die Gäste in derselben Reihenfolge
  const [ages, setAges] = useState<string[]>([]);
  const [youth, setYouth] = useState(false);
  const [terms, setTerms] = useState(false);
  const [payment, setPayment] = useState<"card" | "transfer">("card");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const total = useMemo(() => Object.values(qty).reduce((a, b) => a + b, 0), [qty]);
  const sum = useMemo(() => types.reduce((s, t) => s + t.price_cents * (qty[t.id] ?? 0), 0), [qty, types]);
  const guestCount = Math.max(0, total - 1);
  const agesForOrder = Array.from({ length: total }, (_, i) => ages[i] ?? "");
  const hasMinor = agesForOrder.some((a) => a === "u16" || a === "u18");

  function setAge(i: number, v: string) {
    setAges((a) => {
      const n = [...a];
      n[i] = v;
      return n;
    });
  }

  function change(id: string, delta: number) {
    setQty((q) => {
      const t = types.find((x) => x.id === id)!;
      const next = Math.max(0, Math.min((q[id] ?? 0) + delta, t.available));
      const newTotal = total - (q[id] ?? 0) + next;
      if (newTotal > maxPerOrder) return q;
      return { ...q, [id]: next };
    });
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (total === 0) return setError("Bitte wähle mindestens ein Ticket.");
    if (agesForOrder.some((a) => !a)) return setError("Bitte gib für jede Person das Alter am Tag des Abiballs an.");
    if (preview) return setError("Vorschau: Buchen ist erst nach der Einrichtung von Supabase und Stripe möglich.");
    setBusy(true);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: Object.entries(qty).filter(([, q]) => q > 0).map(([ticket_type_id, quantity]) => ({ ticket_type_id, quantity })),
          name,
          email,
          relation,
          guestOf: relation === "gast" ? guestOf : null,
          guestNames: guests.slice(0, guestCount).map((g) => g.trim()),
          ageGroups: agesForOrder,
          youthProtection: youth,
          terms,
          paymentMethod: transferDays && payment === "transfer" ? "ueberweisung" : "stripe",
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.url) throw new Error(data.error ?? "Unbekannter Fehler");
      window.location.assign(data.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unbekannter Fehler");
      setBusy(false);
    }
  }

  return (
    <form className="form" onSubmit={submit}>
      <div className="tickets">
        {types.map((t) => (
          <div className="ticket-row" key={t.id}>
            <div>
              <div className="h3">{t.name}</div>
              <div className="muted">{t.description}</div>
              <div className="small muted" style={{ marginTop: 6 }}>
                {t.available === 0 ? "Ausverkauft" : t.available <= 20 ? `Nur noch ${t.available} verfügbar` : "Verfügbar"}
              </div>
            </div>
            <div className="price">
              {price(t.price_cents)}
              {!pricesFinal && <span className="price-note">Platzhalter</span>}
            </div>
            <div className="stepper" aria-label={`Anzahl ${t.name}`}>
              <button type="button" onClick={() => change(t.id, -1)} disabled={!salesOpen || (qty[t.id] ?? 0) === 0} aria-label="weniger">−</button>
              <output aria-live="polite">{qty[t.id] ?? 0}</output>
              <button
                type="button"
                onClick={() => change(t.id, 1)}
                disabled={!salesOpen || (qty[t.id] ?? 0) >= t.available || total >= maxPerOrder}
                aria-label="mehr"
              >
                +
              </button>
            </div>
          </div>
        ))}
      </div>
      <p className="small muted" style={{ margin: 0 }}>Höchstens {maxPerOrder} Tickets pro Bestellung. Deine Plätze werden nach dem Klick auf „Zur Zahlung“ 30 Minuten für dich reserviert.</p>

      {total > 0 && (
        <>
          <div className="grid-2" style={{ marginTop: 24 }}>
            <label className="field">
              Vor- und Nachname
              <input type="text" required autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} maxLength={120} />
            </label>
            <label className="field">
              E-Mail (hierhin kommen die Tickets)
              <input type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} maxLength={200} />
            </label>
          </div>

          <div className="grid-2">
            <AgeSelect label="Dein Alter am 25. Juni 2027" value={agesForOrder[0] ?? ""} onChange={(v) => setAge(0, v)} />
          </div>
          <p className="small muted" style={{ margin: 0 }}>{AGE_HINT}</p>

          <div className="choice" role="radiogroup" aria-label="Ich bin">
            <label>
              <input type="radio" name="relation" checked={relation === "abiturient"} onChange={() => setRelation("abiturient")} />
              Abiturient/in
            </label>
            <label>
              <input type="radio" name="relation" checked={relation === "gast"} onChange={() => setRelation("gast")} />
              Gast von …
            </label>
          </div>
          {relation === "gast" && (
            <label className="field">
              Gast von (Name der Abiturientin / des Abiturienten)
              <input type="text" required value={guestOf} onChange={(e) => setGuestOf(e.target.value)} maxLength={120} />
            </label>
          )}

          {guestCount > 0 && (
            <div className="form" style={{ gap: 12 }}>
              <div className="small muted">Namen und Alter der weiteren Gäste (für die Tickets)</div>
              {Array.from({ length: guestCount }).map((_, i) => (
                <div className="grid-2" key={i}>
                  <label className="field">
                    Gast {i + 2}: Vor- und Nachname
                    <input
                      type="text"
                      required
                      maxLength={120}
                      value={guests[i] ?? ""}
                      onChange={(e) => setGuests((g) => {
                        const n = [...g];
                        n[i] = e.target.value;
                        return n;
                      })}
                    />
                  </label>
                  <AgeSelect label={`Alter von Gast ${i + 2}`} value={agesForOrder[i + 1] ?? ""} onChange={(v) => setAge(i + 1, v)} />
                </div>
              ))}
            </div>
          )}

          {hasMinor && <div className="note">{MINOR_HINT}</div>}

          <label className="check">
            <input type="checkbox" required checked={youth} onChange={(e) => setYouth(e.target.checked)} />
            <span>{YOUTH_PROTECTION_TEXT}</span>
          </label>
          <label className="check">
            <input type="checkbox" required checked={terms} onChange={(e) => setTerms(e.target.checked)} />
            <span>
              Ich akzeptiere die <Link href="/agb" target="_blank">AGB</Link> und habe die{" "}
              <Link href="/datenschutz" target="_blank">Datenschutzerklärung</Link> gelesen. Mir ist bekannt, dass für
              Veranstaltungstickets kein Widerrufsrecht besteht (§ 312g Abs. 2 Nr. 9 BGB).
            </span>
          </label>

          <div className="summary">
            <span>{total} {total === 1 ? "Ticket" : "Tickets"}</span>
            <strong>{price(sum)}{!pricesFinal && <span className="price-note">Platzhalter</span>}</strong>
          </div>
          {transferDays && (
            <div className="pay-options" role="radiogroup" aria-label="Zahlungsart">
              <label className={`pay-option ${payment === "card" ? "active" : ""}`}>
                <input type="radio" name="payment" checked={payment === "card"} onChange={() => setPayment("card")} />
                <span>
                  <strong>Karte, Apple Pay oder Google Pay</strong>
                  <span className="small muted">Sofort bezahlt, Tickets kommen direkt per E-Mail.</span>
                </span>
              </label>
              <label className={`pay-option ${payment === "transfer" ? "active" : ""}`}>
                <input type="radio" name="payment" checked={payment === "transfer"} onChange={() => setPayment("transfer")} />
                <span>
                  <strong>Überweisung</strong>
                  <span className="small muted">Plätze {transferDays} Tage reserviert. Tickets erst nach Zahlungseingang, ohne Zahlung wird storniert.</span>
                </span>
              </label>
            </div>
          )}
          {error && <div className="alert" role="alert">{error}</div>}
          <button className="btn block" type="submit" disabled={busy || !salesOpen}>
            {busy ? "Einen Moment …" : payment === "transfer" && transferDays ? "Verbindlich bestellen" : "Zur Zahlung"}
          </button>
          <p className="small muted" style={{ margin: 0, textAlign: "center" }}>
            {payment === "transfer" && transferDays
              ? "Du bekommst die Bankdaten und einen GiroCode für deine Banking-App."
              : "Sichere Zahlung über Stripe: Karte, Apple Pay oder Google Pay."}
          </p>
        </>
      )}
    </form>
  );
}
