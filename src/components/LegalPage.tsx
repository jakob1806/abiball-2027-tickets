import SiteHeader from "./SiteHeader";
import SiteFooter from "./SiteFooter";

export default function LegalPage({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <>
      <SiteHeader />
      <main className="hero" style={{ paddingTop: 64 }}>
        <div className="wrap">
          <h1 className="h1">{title}</h1>
          <div className="note" style={{ maxWidth: 720, marginBottom: 32 }}>
            Platzhalter: Dieser Text muss vor dem Verkaufsstart vollständig ausgefüllt und rechtlich geprüft werden.
          </div>
          <div className="prose">{children}</div>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
