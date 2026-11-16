import type { Metadata } from "next";
import LegalPage from "@/components/LegalPage";
import { EVENT } from "@/lib/event";

export const metadata: Metadata = { title: "Impressum" };

export default function Impressum() {
  return (
    <LegalPage title="Impressum">
      <h2>Angaben gemäß § 5 DDG</h2>
      <p>
        {EVENT.organizer}<br />
        vertreten durch: [Vor- und Nachname der verantwortlichen Person(en)]<br />
        [Straße und Hausnummer]<br />
        [PLZ] München
      </p>
      <h2>Kontakt</h2>
      <p>E-Mail: [kontakt@example.de]<br />Telefon: [optional]</p>
      <h2>Verantwortlich für den Inhalt nach § 18 Abs. 2 MStV</h2>
      <p>[Vor- und Nachname, Anschrift wie oben]</p>
      <h2>Hinweis</h2>
      <p>{EVENT.organizerNote} Das {EVENT.school} ist nicht Veranstalter und nicht Vertragspartner.</p>
      <h2>Verbraucherstreitbeilegung</h2>
      <p>Wir sind nicht bereit oder verpflichtet, an Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle teilzunehmen.</p>
    </LegalPage>
  );
}
