import type { Metadata } from "next";
import LegalPage from "@/components/LegalPage";
import OrganizerAddress from "@/components/OrganizerAddress";
import Ph from "@/components/Ph";
import { EVENT } from "@/lib/event";
import { LEGAL } from "@/lib/legal";

export const metadata: Metadata = { title: "Impressum" };

export default function Impressum() {
  return (
    <LegalPage title="Impressum">
      <h2>Angaben gemäß § 5 Digitale-Dienste-Gesetz (DDG)</h2>
      <OrganizerAddress />

      <h2>Verantwortlich für den Inhalt nach § 18 Abs. 2 MStV</h2>
      <p><Ph>{LEGAL.contentResponsible}</Ph></p>

      <h2>Hinweis zum Veranstalter</h2>
      <p>
        {EVENT.organizerNote} Das {EVENT.school} ist weder Veranstalter noch Vertragspartner für den Ticketverkauf.
      </p>

      <h2>Verbraucherstreitbeilegung</h2>
      <p>
        Wir sind nicht bereit und nicht verpflichtet, an Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle
        teilzunehmen. Bei Fragen oder Problemen schreib uns einfach an <Ph>{LEGAL.email}</Ph>.
      </p>

      <h2>Bildnachweise</h2>
      <p>
        Foto Werk12 / Penthouse: © AAHHH GmbH,{" "}
        <a href="https://aahhh.de" target="_blank" rel="noopener noreferrer">aahhh.de</a>.
        <br />
        Großes Bayerisches Staatswappen:{" "}
        <a href="https://commons.wikimedia.org/wiki/File:Coat_of_arms_of_Bavaria.svg" target="_blank" rel="noopener noreferrer">Wikimedia Commons</a>,
        amtliches Werk des Freistaats Bayern, gemeinfrei nach § 5 Abs. 1 UrhG.
      </p>

      <h2>Haftung für Links</h2>
      <p>
        Diese Seite enthält Links zu Websites Dritter. Für deren Inhalte sind ausschließlich die jeweiligen Anbieter
        verantwortlich. Bei Bekanntwerden von Rechtsverletzungen entfernen wir solche Links umgehend.
      </p>
    </LegalPage>
  );
}
