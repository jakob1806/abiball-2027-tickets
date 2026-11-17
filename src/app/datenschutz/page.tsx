import type { Metadata } from "next";
import LegalPage from "@/components/LegalPage";
import OrganizerAddress from "@/components/OrganizerAddress";
import Ph from "@/components/Ph";
import { EVENT } from "@/lib/event";
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
        ist. Es gibt kein Tracking, keine Analyse-Tools, keine Werbung und keine Cookies auf den öffentlichen Seiten. Hier
        erklären wir nach Art. 13 und 14 Datenschutz-Grundverordnung (DSGVO), welche Daten wir wofür verwenden.
      </p>

      <h2>1. Verantwortlicher</h2>
      <OrganizerAddress />
      <p>
        Einen Datenschutzbeauftragten müssen wir nicht benennen (§ 38 BDSG). Bei allen Fragen zum Datenschutz erreichst du
        uns unter <Ph>{LEGAL.email}</Ph>.
      </p>

      <h2>2. Aufruf der Website und Hosting</h2>
      <p>
        Die Website wird bei Vercel Inc., 440 N Barranca Avenue #4133, Covina, CA 91723, USA gehostet. Beim Aufruf
        verarbeitet Vercel technisch notwendige Daten: IP-Adresse, Datum und Uhrzeit, aufgerufene Seite, Browser- und
        Geräteinformationen sowie Referrer. Das dient der sicheren und stabilen Auslieferung der Seite (Art. 6 Abs. 1
        lit. f DSGVO; unser berechtigtes Interesse ist ein funktionierendes, geschütztes Angebot). Diese Server-Logs werden
        von Vercel nach kurzer Zeit automatisch gelöscht. Die Seite und die Server-Funktionen (z. B. für Bestellung und
        Mailversand) können auf Servern von Vercel in der EU und in den USA laufen. Vercel ist unter dem EU-U.S. Data
        Privacy Framework zertifiziert (Art. 45 DSGVO); mit Vercel besteht ein Vertrag zur Auftragsverarbeitung (Art. 28
        DSGVO). Schriften werden von unserem eigenen Server geladen, es werden keine Daten an Google Fonts übertragen.
      </p>
      <p>
        <strong>Schutz vor Missbrauch:</strong> Damit niemand mit automatisierten Bestellungen Plätze blockiert oder
        Passwörter durchprobiert, zählen wir Bestellungen und fehlgeschlagene Anmeldungen pro Gerät bzw. Netz. Dafür
        speichern wir in unserer Datenbank weder deine IP-Adresse noch deine E-Mail-Adresse im Klartext, sondern nur einen
        mit einem geheimen Schlüssel gebildeten Kurzwert (Hash) zusammen mit einem Zähler. Diese Einträge löschen wir
        nach spätestens zwei Tagen (Art. 6 Abs. 1 lit. f DSGVO; unser berechtigtes Interesse ist ein faires und sicheres
        Ticketverfahren).
      </p>

      <h2>3. Kontakt per E-Mail oder Telefon</h2>
      <p>
        Wenn du uns schreibst oder anrufst, verarbeiten wir deine Angaben (z. B. Name, E-Mail-Adresse, Telefonnummer, Inhalt
        der Nachricht), um dein Anliegen zu beantworten (Art. 6 Abs. 1 lit. b DSGVO, wenn es um deine Bestellung geht, sonst
        Art. 6 Abs. 1 lit. f DSGVO). Unser E-Mail-Postfach wird bereitgestellt von <Ph>{LEGAL.emailProvider}</Ph>. Wir
        löschen die Nachrichten, wenn sie erledigt sind, spätestens mit den Bestelldaten (Abschnitt 13).
      </p>

      <h2>4. Ticketbestellung</h2>
      <p>Für eine Bestellung verarbeiten wir:</p>
      <ul>
        <li>Name und E-Mail-Adresse der bestellenden Person,</li>
        <li>die Angabe „Abiturient/in“ oder „Gast von …“ mit dem Namen der Abiturientin bzw. des Abiturienten,</li>
        <li>die Namen der weiteren Gäste, für die Tickets bestellt werden,</li>
        <li>
          für jedes Ticket die Altersgruppe am Tag des Abiballs (unter 16, 16 oder 17, 18 oder älter); ein Geburtsdatum
          fragen wir nicht ab,
        </li>
        <li>Anzahl und Art der Tickets, Ticketnummern und QR-Codes, Betrag, Zahlungsart, Zahlungsstatus, Bestell- und
          Zahlungszeitpunkt,</li>
        <li>die Bestätigungen zu Jugendschutz und AGB,</li>
        <li>ggf. Notizen des Orga-Teams zur Bestellung (z. B. bei Barzahlung oder Namensänderung).</li>
      </ul>
      <p>
        Zweck ist der Abschluss und die Abwicklung des Ticketkaufs, die Ausstellung personalisierter Tickets und die
        Organisation des Abends (Art. 6 Abs. 1 lit. b DSGVO). Die Angabe „Gast von …“ nutzen wir, um die Gäste den
        Abiturientinnen und Abiturienten zuordnen zu können (Art. 6 Abs. 1 lit. f DSGVO). Die Altersgruppe brauchen wir, um
        die Vorgaben des Jugendschutzgesetzes am Einlass und an der Bar einzuhalten (Bändchenfarbe, Aufenthalt nach 24 Uhr;
        Art. 6 Abs. 1 lit. c DSGVO i. V. m. §§ 5 und 9 JuSchG sowie Art. 6 Abs. 1 lit. f DSGVO). Die Angaben sind für den
        Vertragsschluss erforderlich; ohne sie können wir keine Tickets ausstellen.
      </p>
      <p>
        <strong>Daten weiterer Gäste:</strong> Wenn du Tickets für andere Personen bestellst, erhalten wir deren Namen und
        Altersgruppe von dir (Art. 14 DSGVO). Bitte informiere deine Gäste über diese Datenschutzerklärung. Wir nutzen diese
        Angaben nur für die Tickets und den Einlass.
      </p>
      <p>
        Bei Kartenzahlung werden die Plätze 30 Minuten reserviert. Wird in dieser Zeit nicht bezahlt, wird die Bestellung
        als abgelaufen markiert und die Plätze werden wieder freigegeben. Deine Bestellung und deine Tickets kannst du über
        einen geheimen Link abrufen, den nur du per E-Mail erhältst; diese Seiten werden nicht von Suchmaschinen erfasst.
      </p>

      <h2>5. Zahlung</h2>
      <h3>Karte, Apple Pay, Google Pay (Stripe)</h3>
      <p>
        Die Bezahlung erfolgt über Stripe Payments Europe, Limited, 1 Grand Canal Street Lower, Grand Canal Dock, Dublin,
        D02 H210, Irland. Du gibst deine Zahlungsdaten direkt auf der Bezahlseite von Stripe ein; wir erhalten keine
        Karten- oder Kontodaten, sondern nur den Zahlungsstatus, Betrag und eine Zahlungskennung. An Stripe übermitteln wir
        deine E-Mail-Adresse, eine Bestellkennung, den Bestellbetrag und die Ticketarten (Art. 6 Abs. 1 lit. b DSGVO).
        Stripe verarbeitet Daten teilweise in eigener Verantwortung, etwa zur Betrugsvermeidung und zur Erfüllung
        gesetzlicher Pflichten (z. B. Geldwäschegesetz). Dabei können Daten auch in die USA übermittelt werden; Stripe ist
        unter dem EU-U.S. Data Privacy Framework zertifiziert. Auf der Bezahlseite setzt Stripe eigene, für die Zahlung
        und Betrugsvermeidung notwendige Cookies. Bietet Stripe dir an, deine Zahlungsdaten mit „Link“ für künftige Käufe
        zu speichern, ist das ein eigener Dienst von Stripe, über den du selbst entscheidest. Mehr dazu:{" "}
        {ext("https://stripe.com/de/privacy", "Datenschutzerklärung von Stripe")}. Bei Apple Pay oder Google Pay gelten
        zusätzlich die Datenschutzbestimmungen von Apple bzw. Google.
      </p>

      <h3>Zahlung per Überweisung</h3>
      <p>
        Wenn du per Überweisung bezahlst, sehen wir auf unserem Kontoauszug (Bank: <Ph>{LEGAL.bankName}</Ph>) deinen Namen
        bzw. den Kontoinhaber, deine IBAN, den Betrag und den Verwendungszweck. Wir nutzen diese Angaben nur, um die Zahlung
        deiner Bestellung zuzuordnen (Art. 6 Abs. 1 lit. b DSGVO). Den GiroCode auf deiner Bestellseite erzeugen wir selbst;
        dabei werden keine Daten an Dritte übertragen. Die Zahlungsaufforderung, eine Erinnerung vor Ablauf der Frist und
        ggf. die Stornierungsmitteilung schicken wir dir per E-Mail.
      </p>

      <h3>Barzahlung beim Orga-Team und an der Abendkasse</h3>
      <p>
        Bei Barzahlung oder manueller Buchung durch das Orga-Team erfassen wir dieselben Angaben wie bei einer
        Online-Bestellung. An der Abendkasse erfasst das Einlass-Team Name und Altersgruppe laut Ausweis sowie, welches
        Konto das Ticket verkauft hat, damit die Kasse abgerechnet werden kann (Art. 6 Abs. 1 lit. b und f DSGVO). Eine
        E-Mail-Adresse ist dort nicht nötig.
      </p>

      <h2>6. Datenbank</h2>
      <p>
        Bestell-, Ticket- und Einlassdaten speichern wir in einer Datenbank bei Supabase Inc., 3500 S. DuPont Highway,
        Dover, Kent 19901, Delaware, USA. Der Serverstandort ist die EU (Irland). Mit Supabase besteht ein Vertrag zur
        Auftragsverarbeitung (Art. 28 DSGVO); soweit ein Zugriff aus Drittländern nicht ausgeschlossen werden kann, sind
        EU-Standardvertragsklauseln vereinbart (Art. 46 Abs. 2 lit. c DSGVO). Auf die Datenbank greift nur unser Server zu,
        nicht dein Browser.
      </p>

      <h2>7. Versand der Tickets per E-Mail</h2>
      <p>
        Die Bestätigung mit deinen Tickets (PDF, Kalenderdatei, Wallet-Dateien) sowie Zahlungsaufforderungen und
        Erinnerungen bei Überweisung verschicken wir über Resend (Plus Five Five, Inc., 2261 Market Street #5039, San
        Francisco, CA 94114, USA). Dafür werden deine E-Mail-Adresse, dein Name und der Inhalt der Mail an Resend übermittelt
        (Art. 6 Abs. 1 lit. b DSGVO). Resend kann Daten in den USA verarbeiten und ist unter dem EU-U.S. Data Privacy
        Framework zertifiziert; ein Vertrag zur Auftragsverarbeitung besteht.{" "}
        <Ph>[Falls beim Einrichten der Absender-Domain bei Resend die EU-Region (Irland) gewählt wird, hier ergänzen: „Der Versand erfolgt über Server in der EU.“]</Ph>{" "}
        Wir werten nicht aus, ob du Mails öffnest oder Links anklickst. Kann eine Mail nicht sofort verschickt werden (z. B.
        wegen eines Versandlimits), merken wir sie vor und versuchen es automatisch erneut.
      </p>

      <h2>8. Apple Wallet, Google Wallet, Kalender und Karten</h2>
      <p>
        Die Datei für Apple Wallet (.pkpass) erzeugen wir selbst auf unserem Server; sie wird nur an dein Gerät übertragen.
        Speicherst du sie in Apple Wallet, gelten für die Verarbeitung auf deinem Gerät und ggf. in iCloud die
        Datenschutzbestimmungen von Apple Distribution International Ltd., Hollyhill Industrial Estate, Hollyhill, Cork,
        Irland.
      </p>
      <p>
        Wenn du auf „Zu Google Wallet hinzufügen“ tippst, werden die Ticketdaten (Name, Ticketart, Ticketnummer, Code, Datum
        und Ort der Veranstaltung) an Google Ireland Limited, Gordon House, Barrow Street, Dublin 4, Irland übertragen. Das
        passiert nur, wenn du das selbst auslöst (Art. 6 Abs. 1 lit. b DSGVO); es gelten die Datenschutzbestimmungen von
        Google.
      </p>
      <p>
        Die Kalenderdatei (.ics) wird nur an dein Gerät übertragen. Der Link „In Karten öffnen“ führt zu Google Maps; erst
        wenn du ihn anklickst, werden Daten (u. a. deine IP-Adresse) an Google übertragen.
      </p>

      <h2>9. Einlasskontrolle</h2>
      <p>
        Jedes Ticket hat einen eindeutigen QR-Code. Beim Einlass wird der Code gescannt; wir speichern Zeitpunkt und
        Ergebnis des Scans, damit jedes Ticket nur einmal genutzt werden kann (Art. 6 Abs. 1 lit. b und f DSGVO; berechtigtes
        Interesse ist die Verhinderung von Mehrfachnutzung). Am Einlass kann ein Ausweis verlangt werden, um das Alter für
        den Jugendschutz zu prüfen; den Ausweis speichern oder kopieren wir nicht.
      </p>
      <p>
        <strong>Einlass-App „Abiball Einlass“ (iOS) und Web-Scanner:</strong> Diese werden nur vom Einlass-Team genutzt.
        Zur Anmeldung vergeben wir persönliche Zugangsdaten (Name, Benutzername, Passwort – gehasht und verschlüsselt
        gespeichert). Nach der Anmeldung liegt ein Anmelde-Token sicher im Schlüsselbund des Geräts bzw. im Web-Scanner in
        einem Sitzungs-Cookie (Abschnitt 11). Bei jedem Scan speichern wir, welches Konto das Ticket wann eingelassen hat,
        damit Rückfragen am Einlass geklärt werden können (Art. 6 Abs. 1 lit. f DSGVO). Das Einlass-Team sieht pro Ticket nur
        Name, Ticketnummer, Ticketart, Altersgruppe und Einlassstatus, keine E-Mail-Adressen oder Zahlungsdaten. Die Kamera
        wird nur zum Erkennen der QR-Codes verwendet; Bilder werden weder gespeichert noch übertragen. Die App enthält keine
        Werbung, kein Tracking und keine Analyse-Dienste. Die Konten löschen wir nach der Veranstaltung.
      </p>

      <h2>10. Fotos und Videos auf der Veranstaltung</h2>
      <p>
        <Ph>[Entscheidung nötig. Falls ein Fotograf oder Videograf beauftragt wird, z. B.: „Auf dem Abiball fotografiert
        [Name/Firma] im Auftrag des Abiturjahrgangs. Die Fotos stellen wir den Gästen in einer passwortgeschützten Galerie
        bereit (Art. 6 Abs. 1 lit. f DSGVO; berechtigtes Interesse ist die Erinnerung an den Abiball). Veröffentlichungen
        außerhalb der Galerie (z. B. Social Media, Abizeitung) erfolgen nur mit Einwilligung der Abgebildeten, bei unter
        16-Jährigen zusätzlich der Eltern. Wer nicht fotografiert werden möchte, sagt es bitte dem Fotografen oder dem
        Orga-Team; Löschung kannst du jederzeit unter der oben genannten E-Mail-Adresse verlangen. Die Galerie löschen wir
        [Frist] nach der Veranstaltung.“ Mit dem Fotografen ist dann ein Auftragsverarbeitungsvertrag zu schließen.
        Andernfalls diesen Abschnitt entfernen.]</Ph>
      </p>

      <h2>11. Cookies und Speicherung im Browser</h2>
      <p>
        Die öffentlichen Seiten (Ticketverkauf, Bestell- und Ticketseite) setzen keine Cookies und speichern nichts in
        deinem Browser. Nur im passwortgeschützten Admin-Bereich für das Orga-Team und im Web-Scanner für das Einlass-Team
        wird jeweils ein technisch notwendiges Sitzungs-Cookie gesetzt, das die Anmeldung speichert und mit dem Abmelden
        bzw. nach Ablauf der Sitzung gelöscht wird (§ 25 Abs. 2 Nr. 2 TDDDG; Art. 6 Abs. 1 lit. f DSGVO). Eine Einwilligung
        ist dafür nicht erforderlich. Zu den Cookies auf der Bezahlseite von Stripe siehe Abschnitt 5.
      </p>

      <h2>12. Empfänger und Übermittlung in Drittländer</h2>
      <p>
        Deine Daten geben wir nur an die oben genannten Dienstleister weiter, soweit das für ihre Aufgabe nötig ist. Zugriff
        auf die Bestelldaten haben nur Mitglieder des Orga-Teams, soweit sie ihn für ihre Aufgabe brauchen; Gästelisten und
        Excel-Exporte werden nur für die Organisation genutzt und mit den übrigen Daten gelöscht. Soweit wir gesetzlich dazu
        verpflichtet sind, geben wir Daten an Behörden weiter (z. B. Finanzamt). Wir verkaufen keine Daten und geben sie
        nicht zu Werbezwecken weiter. Das {EVENT.school} und die Betreiberin des Veranstaltungsorts (AAHHH GmbH) erhalten
        keine Bestelldaten.{" "}
        <Ph>[Falls der Sicherheitsdienst oder die AAHHH GmbH eine Gästeliste erhalten soll, hier ergänzen.]</Ph>
      </p>
      <p>
        Bei Vercel, Stripe und Resend können Daten in die USA übermittelt werden. Grundlage ist der
        Angemessenheitsbeschluss der EU-Kommission zum EU-U.S. Data Privacy Framework (Art. 45 DSGVO), bei Supabase
        EU-Standardvertragsklauseln (Art. 46 DSGVO).
      </p>

      <h2>13. Speicherdauer</h2>
      <p>
        Bestell-, Ticket- und Einlassdaten löschen wir {LEGAL.deletionPeriod} nach der Veranstaltung, sofern keine
        gesetzlichen Aufbewahrungspflichten bestehen. Belege über Zahlungen und Erstattungen bewahren wir auf, soweit uns
        steuerrechtliche Vorschriften dazu verpflichten (in der Regel acht Jahre für Buchungsbelege, § 147 AO); diese Daten
        werden dann nur noch für diesen Zweck genutzt und für alles andere gesperrt. Nicht bezahlte, abgelaufene oder
        stornierte Bestellungen löschen wir spätestens mit den übrigen Bestelldaten. Zähler zum Schutz vor Missbrauch
        (Abschnitt 2) löschen wir nach spätestens zwei Tagen, Konten des Einlass-Teams nach der Veranstaltung.
      </p>

      <h2>14. Deine Rechte</h2>
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

      <h2>15. Keine automatisierten Entscheidungen</h2>
      <p>Wir treffen keine automatisierten Entscheidungen und erstellen keine Profile im Sinne von Art. 22 DSGVO.</p>

      <h2>16. Änderungen</h2>
      <p>
        Wenn sich der Ticketverkauf oder die eingesetzten Dienste ändern, passen wir diese Datenschutzerklärung an. Es gilt
        die jeweils hier veröffentlichte Fassung.
      </p>
    </LegalPage>
  );
}
