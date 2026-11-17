import type { Metadata } from "next";
import LegalPage from "@/components/LegalPage";
import OrganizerAddress from "@/components/OrganizerAddress";
import Ph from "@/components/Ph";
import { EVENT, VENUE_BRAND } from "@/lib/event";
import { LEGAL } from "@/lib/legal";

export const metadata: Metadata = { title: "Impressum" };

export default function Impressum() {
  return (
    <LegalPage title="Impressum">
      <h2>Angaben gemäß § 5 Digitale-Dienste-Gesetz (DDG)</h2>
      <OrganizerAddress />

      <h2>Umsatzsteuer</h2>
      <p>
        <Ph>{LEGAL.vatNote}</Ph> Eine Umsatzsteuer-Identifikationsnummer nach § 27a UStG ist nicht vorhanden.
      </p>

      <h2>Verantwortlich für den Inhalt nach § 18 Abs. 2 MStV</h2>
      <p><Ph>{LEGAL.contentResponsible}</Ph></p>

      <h2>Hinweis zum Veranstalter</h2>
      <p>
        {EVENT.organizerNote} Das {EVENT.school} ist weder Veranstalter noch Vertragspartner für den Ticketverkauf.
      </p>
      <p>
        Veranstaltungsort ist das {EVENT.venueName}, betrieben von der AAHHH GmbH ({VENUE_BRAND.label} ·{" "}
        <a href={VENUE_BRAND.url} target="_blank" rel="noopener noreferrer">{VENUE_BRAND.domain}</a>). Die AAHHH GmbH ist
        nicht Veranstalterin und nicht Vertragspartnerin für den Ticketverkauf.
      </p>

      <h2>Verbraucherstreitbeilegung</h2>
      <p>
        Wir sind nicht bereit und nicht verpflichtet, an Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle
        teilzunehmen (§ 36 VSBG). Bei Fragen oder Problemen schreib uns einfach an <Ph>{LEGAL.email}</Ph>.
      </p>

      <h2>Haftung für Inhalte</h2>
      <p>
        Die Inhalte dieser Seite haben wir mit Sorgfalt erstellt. Für die Richtigkeit, Vollständigkeit und Aktualität
        können wir trotzdem keine Gewähr übernehmen. Nach den allgemeinen Gesetzen sind wir für eigene Inhalte
        verantwortlich. Hinweise auf Fehler nehmen wir gern unter der oben genannten Adresse entgegen.
      </p>

      <h2>Haftung für Links</h2>
      <p>
        Diese Seite enthält Links zu Websites Dritter (z. B. Stripe, Google Maps, aahhh.de). Für deren Inhalte sind
        ausschließlich die jeweiligen Anbieter verantwortlich. Zum Zeitpunkt der Verlinkung waren keine Rechtsverstöße
        erkennbar. Bei Bekanntwerden von Rechtsverletzungen entfernen wir solche Links umgehend.
      </p>

      <h2>Urheberrecht und Bildnachweise</h2>
      <p>
        Texte, Gestaltung und Grafiken dieser Seite dürfen ohne unsere Zustimmung nicht außerhalb der privaten Nutzung
        vervielfältigt werden. Fremde Inhalte sind gekennzeichnet:
      </p>
      <p>
        Foto Werk12 / Penthouse: © AAHHH GmbH,{" "}
        <a href="https://aahhh.de" target="_blank" rel="noopener noreferrer">aahhh.de</a>.
        <br />
        Großes Bayerisches Staatswappen:{" "}
        <a href="https://commons.wikimedia.org/wiki/File:Coat_of_arms_of_Bavaria.svg" target="_blank" rel="noopener noreferrer">Wikimedia Commons</a>,
        amtliches Werk des Freistaats Bayern, gemeinfrei nach § 5 Abs. 1 UrhG.
      </p>
    </LegalPage>
  );
}
