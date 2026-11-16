import Image from "next/image";
import SiteHeader from "@/components/SiteHeader";
import SchoolLogo from "@/components/SchoolLogo";
import SiteFooter from "@/components/SiteFooter";
import BookingForm, { type BookableType } from "@/components/BookingForm";
import { EVENT } from "@/lib/event";
import { getAvailability, getTicketTypes } from "@/lib/orders";

export const dynamic = "force-dynamic";

// Vorschau ohne Datenbank: zeigt die Seite mit Platzhalterdaten, solange Supabase nicht eingerichtet ist
const PREVIEW_TYPES: BookableType[] = [
  { id: "ball", name: "Ball-Ticket", description: "Einlass ab 19:00 Uhr, Buffet, Programm und Afterparty.", admission: "ab 19:00 Uhr", price_cents: 6500, available: 300 },
  { id: "afterparty", name: "Afterparty-Ticket", description: "Einlass ab 22:30 Uhr zur Afterparty.", admission: "ab 22:30 Uhr", price_cents: 2000, available: 100 },
];

async function loadTickets(): Promise<{ types: BookableType[]; maxPerOrder: number; salesOpen: boolean; error: boolean; preview: boolean }> {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return { types: PREVIEW_TYPES, maxPerOrder: EVENT.maxPerOrder, salesOpen: true, error: false, preview: true };
  }
  try {
    const [types, avail] = await Promise.all([getTicketTypes(), getAvailability()]);
    return {
      types: types.map((t) => ({
        id: t.id,
        name: t.name,
        description: t.description,
        admission: t.admission,
        price_cents: t.price_cents,
        available: avail.perType[t.id] ?? 0,
      })),
      maxPerOrder: avail.maxPerOrder,
      salesOpen: avail.salesOpen,
      error: false,
      preview: false,
    };
  } catch (err) {
    console.error(err);
    return { types: [], maxPerOrder: EVENT.maxPerOrder, salesOpen: false, error: true, preview: false };
  }
}

export default async function Home() {
  const { types, maxPerOrder, salesOpen, error, preview } = await loadTickets();
  const soldOut = types.length > 0 && types.every((t) => t.available === 0);

  return (
    <>
      <SiteHeader />
      <main>
        <section className="hero">
          <div className="wrap">
            <div className="hero-logo"><SchoolLogo size="md" layout="inline" /></div>
            <p className="eyebrow">Abiturjahrgang 2027</p>
            <h1 className="display">Abiball<br />2027</h1>
            <p className="lead">
              {EVENT.dateLabel}, {EVENT.timeLabel}. {EVENT.venueName}, München.
            </p>
            <div className="row" style={{ marginTop: 40 }}>
              <a className="btn" href="#tickets">Tickets sichern</a>
              <a className="btn ghost" href="#details">Details</a>
            </div>
          </div>
        </section>

        <section className="section" id="details">
          <div className="wrap">
            <h2 className="h2">Der Abend</h2>
            <dl className="facts">
              <div>
                <dt>Wann</dt>
                <dd>{EVENT.dateLabel}<br />{EVENT.timeLabel}</dd>
              </div>
              <div>
                <dt>Wo</dt>
                <dd>
                  {EVENT.venueName}<br />{EVENT.venueStreet}<br />{EVENT.venueCity}
                </dd>
              </div>
              <div>
                <dt>Ablauf</dt>
                <dd>19:00 Einlass Ball<br />Buffet und Programm<br />22:30 Afterparty bis 04:00</dd>
              </div>
            </dl>
            <figure className="figure">
              <Image
                src="/images/aahhh-werk12.jpg"
                alt="Das Werk12 im Werksviertel München bei Sonnenuntergang, oben das Penthouse mit den großen Buchstaben AAHHH"
                width={1500}
                height={752}
                sizes="(max-width: 1160px) 100vw, 1112px"
              />
              <figcaption>
                Werk12, Speicherstraße 20, München. Gefeiert wird im Penthouse im 4. Stock. Foto: © AAHHH GmbH,{" "}
                <a href="https://aahhh.de" target="_blank" rel="noopener noreferrer">aahhh.de</a>
              </figcaption>
            </figure>
          </div>
        </section>

        <section className="section" id="tickets">
          <div className="wrap narrow">
            <h2 className="h2">Tickets</h2>
            {preview && (
              <div className="note" style={{ marginBottom: 24 }}>
                Vorschau ohne Datenbank: Preise und Plätze sind Platzhalter, Buchen ist erst nach der Einrichtung von Supabase und Stripe möglich.
              </div>
            )}
            {error ? (
              <div className="note">Der Ticketverkauf ist gerade nicht erreichbar. Bitte versuche es später noch einmal.</div>
            ) : !salesOpen ? (
              <div className="note">Der Ticketverkauf ist derzeit geschlossen.</div>
            ) : soldOut ? (
              <div className="note">Alle Tickets sind vergeben. Danke an alle, die dabei sind.</div>
            ) : null}
            {!error && types.length > 0 && <BookingForm types={types} maxPerOrder={maxPerOrder} salesOpen={salesOpen && !soldOut} preview={preview} />}
          </div>
        </section>

        <section className="section" id="faq">
          <div className="wrap">
            <h2 className="h2">Gut zu wissen</h2>
            <div className="faq">
              <div>
                <h3 className="h3">Welches Ticket brauche ich?</h3>
                <p>Das Ball-Ticket gilt ab 19:00 Uhr für den ganzen Abend mit Buffet, Programm und Afterparty. Das Afterparty-Ticket gilt ab 22:30 Uhr.</p>
              </div>
              <div>
                <h3 className="h3">Wie bekomme ich meine Tickets?</h3>
                <p>Direkt nach der Zahlung per E-Mail als PDF, für Apple Wallet und Google Wallet. Jedes Ticket hat einen eigenen QR-Code für genau einen Einlass.</p>
              </div>
              <div>
                <h3 className="h3">Jugendschutz</h3>
                <p>Personen unter 18 Jahren dürfen ohne erziehungsbeauftragte Person nur bis 24 Uhr bleiben. Bitte einen Ausweis mitbringen.</p>
              </div>
              <div>
                <h3 className="h3">Rückgabe</h3>
                <p>Für Veranstaltungstickets gibt es kein Widerrufsrecht (§ 312g Abs. 2 Nr. 9 BGB). Bei Fragen melde dich beim Abiturjahrgang, siehe Impressum.</p>
              </div>
              <div>
                <h3 className="h3">Wer veranstaltet?</h3>
                <p>{EVENT.organizerNote}</p>
              </div>
              <div>
                <h3 className="h3">Anfahrt</h3>
                <p>{EVENT.venueName}, {EVENT.venueStreet}, {EVENT.venueCity}. Am besten mit S-Bahn oder U-Bahn bis Ostbahnhof.</p>
              </div>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
