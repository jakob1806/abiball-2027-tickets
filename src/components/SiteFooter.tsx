import Link from "next/link";
import { EVENT } from "@/lib/event";

export default function SiteFooter() {
  return (
    <footer className="foot">
      <div className="wrap cols">
        <div>
          <div>{EVENT.title} · {EVENT.organizer}</div>
          <div>Keine Schulveranstaltung.</div>
          <div style={{ marginTop: 12 }}>
            {EVENT.venueName} · <a href="https://aahhh.de" target="_blank" rel="noopener noreferrer">aahhh · aahhh.de</a>
          </div>
        </div>
        <nav>
          <Link href="/impressum">Impressum</Link>
          <Link href="/datenschutz">Datenschutz</Link>
          <Link href="/agb">AGB</Link>
        </nav>
      </div>
    </footer>
  );
}
