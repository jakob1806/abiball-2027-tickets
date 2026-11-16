import type { Metadata } from "next";
import LegalPage from "@/components/LegalPage";
import OrganizerAddress from "@/components/OrganizerAddress";
import Ph from "@/components/Ph";
import { LEGAL } from "@/lib/legal";

export const metadata: Metadata = { title: "Datenschutz" };

const ext = (href: string, label: string) => (
  <a href={href} target="_blank" rel="noopener noreferrer">{label}</a>
);

export default function Datenschutz() {
  return (
    <LegalPage title="Datenschutz">
      <p>
        Wir verarbeiten personenbezogene Daten nur, soweit das für den Ticketverkauf und die Durchführung des Abiballs nötig
        ist. Es gibt kein Tracking, keine Analyse-Tools und keine Werbung. Hier erklären wir nach Art. 13 und 14
        Datenschutz-Grundverordnung (DSGVO), welche Daten wir wofür verwenden.
      </p>

      <h2>1. Verantwortlicher</h2>
      <OrganizerAddress />

      <h2>2. Aufruf der Website und Hosting</h2>
      <p>
        Die Website wird bei Vercel Inc., 440 N Barranca Avenue #4133, Covina, CA 91723, USA gehostet. Beim Aufruf
        verarbeitet Vercel technisch notwendige Daten: IP-Adresse, Datum und Uhrzeit, aufgerufene Seite, Browser- und
        Geräteinformationen sowie Referrer. Das dient der sicheren und stabilen Auslieferung der Seite (Art. 6 Abs. 1
        lit. f DSGVO; unser berechtigtes Interesse ist ein funktionierendes, geschütztes Angebot). Diese Server-Logs werden
        von Vercel nach kurzer Zeit automatisch gelöscht. Vercel ist unter dem EU-U.S. Data Privacy Framework zertifiziert
        (Art. 45 DSGVO); mit Vercel besteht ein Vertrag zur Auftragsverarbeitung. Schriften werden von unserem eigenen
        Server geladen, es werden keine Daten an Google Fonts übertragen.
      </p>
      <p>
        <strong>Schutz vor Missbrauch:</strong> Damit niemand mit automatisierten Bestellungen Plätze blockiert oder
        Passwörter durchprobiert, zählen wir Bestellungen und fehlgeschlagene Anmeldungen pro Gerät bzw. Netz. Dafür
        speichern wir in unserer Datenbank weder deine IP-Adresse noch deine E-Mail-Adresse im Klartext, sondern nur einen
        mit einem geheimen Schlüssel gebildeten Kurzwert (Hash) zusammen mit einem Zähler. Diese Einträge löschen wir
        nach spätestens zwei Tagen (Art. 6 Abs. 1 lit. f DSGVO; unser berechtigtes Interesse ist ein faires und sicheres
        Ticketverfahren).
      </p>

      <h2>3. Ticketbestellung</h2>
      <p>Für eine Bestellung verarbeiten wir:</p>
      <ul>
        <li>Name und E-Mail-Adresse der bestellenden Person,</li>
        <li>die Angabe „Abiturient/in“ oder „Gast von …“ mit dem Namen der Abiturientin bzw. des Abiturienten,</li>
        <li>die Namen der weiteren Gäste, für die Tickets bestellt werden,</li>
        <li>
          für jedes Ticket die Altersgruppe am Tag des Abiballs (unter 16, 16 oder 17, 18 oder älter); ein Geburtsdatum
          fragen wir nicht ab,
        </li>
        <li>Anzahl und Art der Tickets, Betrag, Zahlungsstatus, Bestell- und Zahlungszeitpunkt,</li>
        <li>die Bestätigungen zu Jugendschutz und AGB.</li>
      </ul>
      <p>
        Zweck ist der Abschluss und die Abwicklung des Ticketkaufs, die Ausstellung personalisierter Tickets und die
        Organisation des Abends (Art. 6 Abs. 1 lit. b DSGVO). Die Angabe „Gast von …“ nutzen wir, um die Gäste den
        Abiturientinnen und Abiturienten zuordnen zu können (Art. 6 Abs. 1 lit. f DSGVO). Die Altersgruppe brauchen wir, um
        die Vorgaben des Jugendschutzgesetzes am Einlass und an der Bar einzuhalten (Bändchenfarbe, Aufenthalt nach 24 Uhr;
        Art. 6 Abs. 1 lit. c und f DSGVO). Ohne diese Angaben können wir keine Tickets ausstellen.
      </p>
      <p>
        <strong>Daten weiterer Gäste:</strong> Wenn du Tickets für andere Personen bestellst, erhalten wir deren Namen von
        dir. Bitte informiere deine Gäste über diese Datenschutzerklärung. Wir nutzen diese Namen nur für die Tickets und
        den Einlass.
      </p>
      <p>
        Bestellungen werden 30 Minuten reserviert. Wird in dieser Zeit nicht bezahlt, wird die Bestellung als abgelaufen
        markiert und die Plätze werden wieder freigegeben.
      </p>

      <h2>4. Zahlung über Stripe</h2>
      <p>
        Die Bezahlung (Karte, Apple Pay, Google Pay) erfolgt über Stripe Payments Europe, Limited, 1 Grand Canal Street
        Lower, Grand Canal Dock, Dublin, D02 H210, Irland. Du gibst deine Zahlungsdaten direkt auf der Bezahlseite von Stripe
        ein; wir erhalten keine Karten- oder Kontodaten, sondern nur den Zahlungsstatus, Betrag und eine Zahlungskennung.
        An Stripe übermitteln wir deine E-Mail-Adresse, den Bestellbetrag und die Ticketarten (Art. 6 Abs. 1 lit. b DSGVO).
        Stripe verarbeitet Daten teilweise in eigener Verantwortung, etwa zur Betrugsvermeidung und zur Erfüllung
        gesetzlicher Pflichten. Dabei können Daten auch in die USA übermittelt werden; Stripe ist unter dem EU-U.S. Data
        Privacy Framework zertifiziert. Auf der Bezahlseite setzt Stripe eigene, für die Zahlung notwendige Cookies. Mehr
        dazu: {ext("https://stripe.com/de/privacy", "Datenschutzerklärung von Stripe")}. Bei Apple Pay oder Google Pay gelten
        zusätzlich die Datenschutzbestimmungen von Apple bzw. Google.
      </p>

      <h3>Zahlung per Überweisung</h3>
      <p>
        Wenn du per Überweisung bezahlst, sehen wir auf unserem Kontoauszug deinen Namen bzw. den Kontoinhaber, deine IBAN,
        den Betrag und den Verwendungszweck. Wir nutzen diese Angaben nur, um die Zahlung deiner Bestellung zuzuordnen
        (Art. 6 Abs. 1 lit. b DSGVO). Die Zahlungsaufforderung, eine Erinnerung vor Ablauf der Frist und ggf. die
        Stornierungsmitteilung schicken wir dir per E-Mail.
      </p>

      <h2>5. Datenbank</h2>
      <p>
        Bestell- und Ticketdaten speichern wir in einer Datenbank bei Supabase (Supabase Pte. Ltd. bzw. Supabase Inc.).
        Der Serverstandort ist die EU (Irland). Mit Supabase besteht ein Vertrag zur Auftragsverarbeitung; soweit ein Zugriff
        aus Drittländern nicht ausgeschlossen werden kann, sind EU-Standardvertragsklauseln vereinbart (Art. 46 DSGVO).
        Auf die Datenbank greift nur unser Server zu, nicht dein Browser.
      </p>

      <h2>6. Versand der Tickets per E-Mail</h2>
      <p>
        Die Bestätigung mit deinen Tickets (PDF, Kalenderdatei, Wallet-Dateien) verschicken wir über Resend (Plus Five Five,
        Inc., USA). Dafür werden deine E-Mail-Adresse, dein Name und der Inhalt der Mail an Resend übermittelt
        (Art. 6 Abs. 1 lit. b DSGVO). Resend speichert Daten in den USA und ist unter dem EU-U.S. Data Privacy Framework
        zertifiziert; ein Vertrag zur Auftragsverarbeitung besteht.
      </p>

      <h2>7. Apple Wallet und Google Wallet</h2>
      <p>
        Wenn du ein Ticket in Apple Wallet oder Google Wallet speicherst, werden die Ticketdaten (Name, Ticketart, Code,
        Datum und Ort der Veranstaltung) an Apple bzw. Google übertragen. Das passiert nur, wenn du das selbst auslöst
        (Art. 6 Abs. 1 lit. b DSGVO). Es gelten die Datenschutzbestimmungen von Apple Distribution International Ltd.
        (Irland) bzw. Google Ireland Limited.
      </p>

      <h2>8. Einlasskontrolle</h2>
      <p>
        Jedes Ticket hat einen eindeutigen QR-Code. Beim Einlass wird der Code gescannt; wir speichern Zeitpunkt und
        Ergebnis des Scans, damit jedes Ticket nur einmal genutzt werden kann (Art. 6 Abs. 1 lit. b und f DSGVO; berechtigtes
        Interesse ist die Verhinderung von Mehrfachnutzung). Am Einlass kann ein Ausweis verlangt werden, um das Alter für
        den Jugendschutz zu prüfen; den Ausweis speichern wir nicht.
      </p>
      <p>
        <strong>Einlass-App „Abiball Einlass“ (iOS) und Web-Scanner:</strong> Diese werden nur vom Einlass-Team genutzt.
        Zur Anmeldung vergeben wir persönliche Zugangsdaten (Name, Benutzername, Passwort – gehasht und verschlüsselt gespeichert). Nach
        der Anmeldung liegt ein Anmelde-Token sicher im Schlüsselbund des Geräts. Bei jedem Scan speichern wir, welches
        Konto das Ticket wann eingelassen hat, damit Rückfragen am Einlass geklärt werden können (Art. 6 Abs. 1 lit. f
        DSGVO). Das Einlass-Team sieht pro Ticket nur Name, Ticketnummer, Ticketart, Altersgruppe und Einlassstatus, keine
        E-Mail-Adressen oder Zahlungsdaten. An der Abendkasse erfasst es Name und Altersgruppe laut Ausweis. Die Kamera wird nur zum Erkennen der QR-Codes verwendet; Bilder werden weder gespeichert noch übertragen.
        Die App enthält keine Werbung, kein Tracking und keine Analyse-Dienste. Die Konten löschen wir nach der
        Veranstaltung.
      </p>

      <h2>9. Fotos und Videos auf der Veranstaltung</h2>
      <p>
        <Ph>[Falls ein Fotograf oder Videograf beauftragt wird: Wer fotografiert, wofür die Aufnahmen genutzt werden (z. B.
        Galerie für den Jahrgang, kein öffentliches Posting ohne Einwilligung), wo und wie lange sie gespeichert werden und an
        wen man sich wenden kann, um nicht fotografiert zu werden bzw. eine Löschung zu verlangen. Andernfalls diesen
        Abschnitt entfernen.]</Ph>
      </p>

      <h2>10. Admin-Bereich und Cookies</h2>
      <p>
        Die öffentlichen Seiten setzen keine Cookies. Nur im passwortgeschützten Admin-Bereich für das Orga-Team wird ein
        technisch notwendiges Sitzungs-Cookie gesetzt (§ 25 Abs. 2 Nr. 2 TDDDG). Zugriff auf die Bestelldaten haben nur
        Mitglieder des Orga-Teams, soweit sie ihn für ihre Aufgabe brauchen.
      </p>

      <h2>11. Empfänger</h2>
      <p>
        Deine Daten geben wir nur an die oben genannten Dienstleister weiter, soweit das für ihre Aufgabe nötig ist. Wir
        verkaufen keine Daten und geben sie nicht zu Werbezwecken weiter. Das {"Wittelsbacher-Gymnasium München"} erhält
        keine Bestelldaten.
      </p>

      <h2>12. Speicherdauer</h2>
      <p>
        Bestell-, Ticket- und Einlassdaten löschen wir {LEGAL.deletionPeriod} nach der Veranstaltung, sofern keine
        gesetzlichen Aufbewahrungspflichten bestehen. Belege über Zahlungen bewahren wir auf, soweit uns steuer- oder
        handelsrechtliche Vorschriften dazu verpflichten (bis zu zehn Jahre, z. B. § 147 AO); diese Daten werden dann nur
        noch für diesen Zweck genutzt. Nicht bezahlte, abgelaufene Bestellungen löschen wir spätestens mit den übrigen
        Bestelldaten.
      </p>

      <h2>13. Deine Rechte</h2>
      <p>Du hast das Recht auf</p>
      <ul>
        <li>Auskunft über deine gespeicherten Daten (Art. 15 DSGVO),</li>
        <li>Berichtigung unrichtiger Daten (Art. 16 DSGVO),</li>
        <li>Löschung (Art. 17 DSGVO) und Einschränkung der Verarbeitung (Art. 18 DSGVO),</li>
        <li>Datenübertragbarkeit (Art. 20 DSGVO).</li>
      </ul>
      <p>
        <strong>Widerspruchsrecht (Art. 21 DSGVO):</strong> Soweit wir Daten auf Grundlage berechtigter Interessen
        verarbeiten (Art. 6 Abs. 1 lit. f DSGVO), kannst du dem aus Gründen, die sich aus deiner besonderen Situation
        ergeben, jederzeit widersprechen.
      </p>
      <p>
        Schreib uns dafür an <Ph>{LEGAL.email}</Ph>. Außerdem kannst du dich bei einer Datenschutz-Aufsichtsbehörde
        beschweren (Art. 77 DSGVO), zum Beispiel beim Bayerischen Landesamt für Datenschutzaufsicht (BayLDA), Promenade 18,
        91522 Ansbach, {ext("https://www.lda.bayern.de", "www.lda.bayern.de")}.
      </p>

      <h2>14. Keine automatisierten Entscheidungen</h2>
      <p>Wir treffen keine automatisierten Entscheidungen und erstellen keine Profile im Sinne von Art. 22 DSGVO.</p>
    </LegalPage>
  );
}
