import type { Metadata } from "next";
import LegalPage from "@/components/LegalPage";
import { EVENT, VENUE_ONE_LINE } from "@/lib/event";

export const metadata: Metadata = { title: "AGB" };

export default function Agb() {
  return (
    <LegalPage title="AGB">
      <h2>1. Veranstalter und Vertragspartner</h2>
      <p>
        Veranstalter und Vertragspartner ist der {EVENT.organizer} [Rechtsform/vertretende Personen ergänzen].{" "}
        {EVENT.organizerNote}
      </p>
      <h2>2. Veranstaltung</h2>
      <p>{EVENT.title}, {EVENT.dateLabel}, {EVENT.timeLabel}, {VENUE_ONE_LINE}.</p>
      <h2>3. Vertragsschluss und Zahlung</h2>
      <p>
        Der Vertrag kommt mit Abschluss der Zahlung über Stripe zustande. Nach der Auswahl werden die Plätze 30 Minuten reserviert.
        Pro Bestellung sind höchstens 8 Tickets möglich.
      </p>
      <h2>4. Kein Widerrufsrecht</h2>
      <p>
        Für Verträge über Freizeitveranstaltungen mit festem Termin besteht nach § 312g Abs. 2 Nr. 9 BGB kein Widerrufsrecht.
        Eine Rückgabe ist ausgeschlossen, sofern die Veranstaltung wie angekündigt stattfindet.
      </p>
      <h2>5. Tickets und Einlass</h2>
      <p>
        Jedes Ticket hat einen eindeutigen QR-Code und berechtigt zu genau einem Einlass. Kopien werden beim zweiten Scan abgewiesen.
        Ball-Tickets gelten ab 19:00 Uhr, Afterparty-Tickets ab 22:30 Uhr.
      </p>
      <h2>6. Jugendschutz</h2>
      <p>
        Personen unter 18 Jahren dürfen sich ohne erziehungsbeauftragte Person nur bis 24 Uhr auf der Veranstaltung aufhalten.
        Am Einlass kann ein amtlicher Ausweis verlangt werden. [Regelung zu Erziehungsbeauftragung ergänzen.]
      </p>
      <h2>7. Absage</h2>
      <p>[Regelung bei Absage oder Verlegung der Veranstaltung ergänzen, z. B. Erstattung des Ticketpreises.]</p>
      <h2>8. Hausrecht</h2>
      <p>[Hausordnung des Veranstaltungsorts und Hausrecht ergänzen.]</p>
    </LegalPage>
  );
}
