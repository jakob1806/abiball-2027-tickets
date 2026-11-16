import Link from "next/link";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";

export default function NotFound() {
  return (
    <>
      <SiteHeader />
      <main className="hero">
        <div className="wrap">
          <h1 className="h1">Nicht gefunden.</h1>
          <p className="lead">Diese Seite gibt es nicht oder der Link ist nicht mehr gültig.</p>
          <div className="row" style={{ marginTop: 32 }}><Link className="btn" href="/">Zur Startseite</Link></div>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
