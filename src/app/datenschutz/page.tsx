import type { Metadata } from "next";
import LegalPage from "@/components/LegalPage";
import { EVENT } from "@/lib/event";

export const metadata: Metadata = { title: "Datenschutz" };

export default function Datenschutz() {
  return (
    <LegalPage title="Datenschutz">
      <h2>1. Verantwortlicher</h2>
      <p>{EVENT.organizer}, [Anschrift und E-Mail wie im Impressum].</p>
      <h2>2. Welche Daten wir verarbeiten</h2>
      <p>
        Bei einer Ticketbestellung verarbeiten wir Name, E-Mail-Adresse, die Angabe „Abiturient/in“ oder „Gast von …“, die Namen
        weiterer Gäste, die bestellten Tickets sowie Zahlungsstatus und Einlasszeitpunkt. Rechtsgrundlage ist Art. 6 Abs. 1 lit. b
        DSGVO (Vertragserfüllung).
      </p>
      <h2>3. Dienstleister</h2>
      <ul>
        <li>Zahlungsabwicklung: Stripe Payments Europe Ltd., Irland. Zahlungsdaten erhalten wir nicht.</li>
        <li>Datenbank: Supabase Inc. [Region der Datenbank angeben, z. B. EU (Frankfurt)].</li>
        <li>E-Mail-Versand: Resend [Anbieterangaben ergänzen].</li>
        <li>Hosting: [z. B. Vercel Inc.].</li>
        <li>Optional Apple Wallet / Google Wallet, wenn du ein Ticket dort speicherst.</li>
      </ul>
      <p>[Angaben zu Auftragsverarbeitungsverträgen und Drittlandübermittlungen ergänzen.]</p>
      <h2>4. Speicherdauer</h2>
      <p>[z. B. Löschung der Bestelldaten drei Monate nach der Veranstaltung, soweit keine gesetzlichen Aufbewahrungspflichten bestehen.]</p>
      <h2>5. Deine Rechte</h2>
      <p>Auskunft, Berichtigung, Löschung, Einschränkung, Datenübertragbarkeit, Widerspruch sowie Beschwerde bei einer Aufsichtsbehörde (z. B. BayLDA).</p>
      <h2>6. Cookies</h2>
      <p>Die öffentliche Seite setzt keine Tracking-Cookies. Für den Admin-Bereich wird ein technisch notwendiges Sitzungs-Cookie verwendet.</p>
    </LegalPage>
  );
}
