import Link from "next/link";

export default function SiteHeader() {
  return (
    <header className="top">
      <div className="wrap">
        <Link href="/" className="brand">Abiball 2027</Link>
        <nav className="nav">
          <Link className="nav-link" href="/#details">Details</Link>
          <Link className="nav-link" href="/#tickets">Tickets</Link>
          <Link className="nav-link" href="/#faq">Fragen</Link>
          <Link className="btn small nav-cta" href="/#tickets" style={{ color: "#fff" }}>Tickets</Link>
        </nav>
      </div>
    </header>
  );
}
