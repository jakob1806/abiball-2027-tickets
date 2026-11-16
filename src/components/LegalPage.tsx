import SiteHeader from "./SiteHeader";
import SiteFooter from "./SiteFooter";
import { LEGAL } from "@/lib/legal";

export default function LegalPage({ title, children, showDraftNote = true }: { title: string; children: React.ReactNode; showDraftNote?: boolean }) {
  return (
    <>
      <SiteHeader />
      <main className="hero" style={{ paddingTop: 64 }}>
        <div className="wrap">
          <h1 className="h1">{title}</h1>
          {showDraftNote && (
            <div className="note" style={{ maxWidth: 720, marginBottom: 32 }}>
              Gelb markierte Angaben werden noch ergänzt. Dieser Text wurde sorgfältig erstellt, ersetzt aber keine Rechtsberatung.
            </div>
          )}
          <div className="prose">
            {children}
            <p className="small muted" style={{ marginTop: 48 }}>Stand: {LEGAL.updated}</p>
          </div>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
