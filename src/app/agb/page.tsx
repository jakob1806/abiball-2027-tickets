import type { Metadata } from "next";
import Link from "next/link";
import LegalPage from "@/components/LegalPage";
import OrganizerAddress from "@/components/OrganizerAddress";
import Ph from "@/components/Ph";
import { EVENT, VENUE_ONE_LINE } from "@/lib/event";
import { LEGAL } from "@/lib/legal";

export const metadata: Metadata = { title: "AGB" };

export default function Agb() {
  return (
    <LegalPage title="Allgemeine Geschäftsbedingungen">
      <p>für den Verkauf von Tickets für den {EVENT.title} des Abiturjahrgangs 2027 am {EVENT.school}.</p>

      <h2>§ 1 Veranstalter und Geltungsbereich</h2>
      <p>
        (1) Veranstalter und dein Vertragspartner ist:
      </p>
      <OrganizerAddress />
      <p>
        (2) {EVENT.organizerNote} Das {EVENT.school} ist weder Veranstalter noch Vertragspartner.
      </p>
      <p>
        (3) Diese AGB gelten für alle Ticketkäufe über diese Website sowie für Tickets, die das Orga-Team direkt verkauft
        (z. B. gegen Barzahlung oder Überweisung).
      </p>

      <h2>§ 2 Veranstaltung</h2>
      <p>
        {EVENT.title}, {EVENT.dateLabel}, {EVENT.timeLabel}, {VENUE_ONE_LINE}. Änderungen im Ablauf und Programm, die den
        Charakter der Veranstaltung nicht wesentlich verändern, bleiben vorbehalten.
      </p>

      <h2>§ 3 Ticketarten und Preise</h2>
      <p>
        (1) <strong>Ball-Ticket:</strong> Einlass ab 19:00 Uhr, Buffet, Programm und Afterparty.
        <br />
        <strong>Afterparty-Ticket:</strong> Einlass ab 22:30 Uhr zur Afterparty.
      </p>
      <p>
        (2) Es gelten die im Bestellvorgang angezeigten Preise. Es fallen keine Vorverkaufs-, Service- oder Versandgebühren
        an. <Ph>{LEGAL.vatNote}</Ph>
      </p>
      <p>(3) Pro Bestellung sind höchstens 8 Tickets möglich. Die Gesamtzahl der Plätze ist begrenzt.</p>

      <h2>§ 4 Vertragsschluss</h2>
      <p>
        (1) Die Darstellung der Tickets auf der Website ist noch kein verbindliches Angebot. Mit dem Klick auf „Zur Zahlung“
        und dem Abschluss der Zahlung gibst du ein verbindliches Angebot zum Kauf der ausgewählten Tickets ab.
      </p>
      <p>
        (2) Nach dem Klick auf „Zur Zahlung“ werden die Plätze für 30 Minuten reserviert. Wird die Zahlung in dieser Zeit
        nicht abgeschlossen, verfällt die Reservierung.
      </p>
      <p>
        (3) Bei Zahlung per Karte, Apple Pay oder Google Pay kommt der Vertrag zustande, sobald die Zahlung erfolgreich war
        und wir dir die Bestellung per E-Mail mit den Tickets bestätigen. Bei Zahlung per Überweisung kommt der Vertrag mit
        unserer Bestellbestätigung per E-Mail zustande; die Tickets erhältst du nach Zahlungseingang (§ 5 Abs. 2). Bei
        Direktverkauf durch das Orga-Team kommt der Vertrag mit Zahlung und Ausgabe der Tickets zustande.
      </p>
      <p>
        (4) Vertragssprache ist Deutsch. Den Vertragstext speichern wir; deine Bestelldaten und Tickets kannst du jederzeit
        über den Link in der Bestätigungsmail abrufen. Diese AGB kannst du auf dieser Seite ausdrucken oder speichern.
      </p>
      <p>
        (5) Wer Tickets bestellt, muss volljährig sein oder mit Zustimmung der Eltern bzw. Sorgeberechtigten handeln.
      </p>

      <h2>§ 5 Zahlung</h2>
      <p>
        (1) Online bezahlst du über den Zahlungsdienstleister Stripe per Kredit- oder Debitkarte, Apple Pay oder Google Pay.
        Der Betrag wird mit Abschluss der Bestellung fällig.
      </p>
      <p>
        (2) Sofern angeboten, kannst du auch per Überweisung (Vorkasse) bezahlen. Du erhältst die Bankverbindung, den Betrag
        und einen Verwendungszweck per E-Mail und auf deiner Bestellseite. Die Plätze sind bis zum Ablauf der dort genannten
        Zahlungsfrist reserviert. Geht der vollständige Betrag mit dem richtigen Verwendungszweck bis dahin nicht ein, wird
        die Bestellung automatisch storniert; du wirst darüber per E-Mail informiert. Die Tickets werden nach Zahlungseingang
        ausgestellt. Kosten deiner Bank für die Überweisung trägst du selbst.
      </p>
      <p>
        (3) Beim Direktverkauf ist Barzahlung oder Überweisung nach Absprache mit dem Orga-Team möglich; Tickets werden dann
        nach Zahlungseingang ausgestellt.
      </p>

      <h2>§ 6 Kein Widerrufsrecht</h2>
      <p>
        Für Verträge über Freizeitveranstaltungen, die für einen bestimmten Termin vorgesehen sind, besteht nach § 312g
        Abs. 2 Nr. 9 BGB <strong>kein Widerrufsrecht</strong>. Eine Rückgabe oder Erstattung ist deshalb ausgeschlossen,
        sofern die Veranstaltung wie angekündigt stattfindet. Deine Rechte bei Absage oder Verlegung (§ 10) bleiben
        unberührt.
      </p>

      <h2>§ 7 Tickets und Einlass</h2>
      <p>
        (1) Du erhältst deine Tickets per E-Mail als PDF und kannst sie auf deiner Bestellseite sowie in Apple Wallet oder
        Google Wallet abrufen. Jedes Ticket trägt einen Namen und einen eindeutigen QR-Code.
      </p>
      <p>
        (2) Jeder QR-Code berechtigt zu genau einem Einlass. Beim ersten Scan wird das Ticket entwertet; jede weitere Vorlage
        desselben Codes (z. B. als Kopie oder Screenshot) wird abgewiesen. Bewahre deine Tickets deshalb sorgfältig auf und
        gib sie nur an die jeweiligen Gäste weiter.
      </p>
      <p>
        (3) Ein Ticket darf an eine andere Person weitergegeben werden, wenn das unentgeltlich oder höchstens zum
        ursprünglichen Preis geschieht. Bitte teile uns den neuen Namen mit, damit wir das Ticket umschreiben können. Der
        gewerbliche Weiterverkauf ist nicht gestattet.
      </p>
      <p>
        (4) Am Einlass kann ein amtlicher Lichtbildausweis verlangt werden. Ball-Tickets gelten ab 19:00 Uhr,
        Afterparty-Tickets ab 22:30 Uhr. Wer das Gelände verlässt, hat keinen Anspruch auf erneuten Einlass, sofern das
        Orga-Team nichts anderes regelt.
      </p>

      <h2>§ 8 Jugendschutz</h2>
      <p>Es gilt das Jugendschutzgesetz (JuSchG). Insbesondere:</p>
      <ul>
        <li>Personen unter 16 Jahren dürfen nur in Begleitung einer personensorgeberechtigten oder erziehungsbeauftragten Person teilnehmen.</li>
        <li>Jugendliche ab 16 und unter 18 Jahren dürfen ohne eine solche Begleitung bis 24:00 Uhr bleiben; danach nur mit einer erziehungsbeauftragten Person.</li>
        <li>Eine erziehungsbeauftragte Person muss volljährig sein und eine schriftliche Erziehungsbeauftragung der Eltern vorlegen. <Ph>[Ggf. Link zum Formular ergänzen]</Ph></li>
        <li>Branntweinhaltige Getränke werden nur an Volljährige ausgegeben, Bier, Wein und Sekt erst ab 16 Jahren.</li>
      </ul>
      <p>
        Mit der Bestellung bestätigst du, diese Regeln zu kennen und deine Gäste darüber zu informieren. Wer gegen die Regeln
        verstößt oder sein Alter nicht nachweisen kann, kann vom Einlass ausgeschlossen oder der Veranstaltung verwiesen
        werden, ohne dass der Ticketpreis erstattet wird.
      </p>

      <h2>§ 9 Hausrecht und Verhalten</h2>
      <p>
        Es gelten die Hausordnung des Veranstaltungsorts und die Anweisungen des Orga-Teams, des Sicherheitsdienstes und des
        Personals vor Ort. Wer andere gefährdet oder belästigt, erheblich alkoholisiert ist, Drogen mitbringt oder grob gegen
        die Hausordnung verstößt, kann vom Einlass ausgeschlossen oder der Veranstaltung verwiesen werden. Ein Anspruch auf
        Erstattung besteht in diesem Fall nicht. Für Schäden, die Gäste schuldhaft verursachen, haften sie selbst.
      </p>

      <h2>§ 10 Absage und Verlegung</h2>
      <p>
        (1) Muss der Veranstalter den {EVENT.title} absagen, erstatten wir den gezahlten Ticketpreis.
      </p>
      <p>
        (2) Wird die Veranstaltung auf einen anderen Termin verlegt, bleiben die Tickets gültig. Wer den neuen Termin nicht
        wahrnehmen kann, erhält den Ticketpreis auf Anfrage erstattet, wenn die Anfrage innerhalb von zwei Wochen nach
        Bekanntgabe des neuen Termins bei uns eingeht.
      </p>
      <p>
        (3) Erstattungen erfolgen über das ursprüngliche Zahlungsmittel bzw. per Überweisung. Weitergehende Ansprüche,
        z. B. auf Ersatz von Anreise- oder Übernachtungskosten, bestehen nur nach § 11.
      </p>

      <h2>§ 11 Haftung</h2>
      <p>
        (1) Wir haften unbeschränkt bei Vorsatz und grober Fahrlässigkeit sowie für Schäden aus der Verletzung des Lebens,
        des Körpers oder der Gesundheit.
      </p>
      <p>
        (2) Bei leichter Fahrlässigkeit haften wir nur bei Verletzung einer wesentlichen Vertragspflicht, deren Erfüllung die
        ordnungsgemäße Durchführung des Vertrags überhaupt erst ermöglicht und auf deren Einhaltung du regelmäßig vertrauen
        darfst, und zwar begrenzt auf den vorhersehbaren, typischerweise eintretenden Schaden.
      </p>
      <p>
        (3) Für mitgebrachte Gegenstände, Garderobe und Wertsachen haften wir nur nach Abs. 1 und 2.
        <Ph>[Regelung zur Garderobe ergänzen, falls es eine betreute Garderobe gibt]</Ph>
      </p>

      <h2>§ 12 Foto- und Videoaufnahmen</h2>
      <p>
        <Ph>[Falls fotografiert oder gefilmt wird: Hinweis, dass auf der Veranstaltung Aufnahmen entstehen, wofür sie genutzt
        werden und wie man widersprechen kann. Details stehen in der Datenschutzerklärung.]</Ph>
      </p>

      <h2>§ 13 Datenschutz</h2>
      <p>
        Wie wir deine Daten verarbeiten, erklären wir in der <Link href="/datenschutz">Datenschutzerklärung</Link>.
      </p>

      <h2>§ 14 Schlussbestimmungen</h2>
      <p>
        (1) Es gilt das Recht der Bundesrepublik Deutschland. Als Verbraucher mit gewöhnlichem Aufenthalt in einem anderen
        EU-Staat behältst du den Schutz der zwingenden Vorschriften deines Aufenthaltsstaats.
      </p>
      <p>
        (2) Sollte eine Bestimmung dieser AGB unwirksam sein, bleiben die übrigen Bestimmungen wirksam. An die Stelle der
        unwirksamen Bestimmung tritt die gesetzliche Regelung.
      </p>
    </LegalPage>
  );
}
