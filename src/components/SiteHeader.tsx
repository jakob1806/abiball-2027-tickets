import Link from "next/link";

export default function SiteHeader() {
  return (
    <header className="top">
      <div className="wrap">
        <Link href="/" className="brand">Abiball 2027</Link>
        <nav className="nav">
          <Link href="/#details">Details</Link>
          <Link href="/#tickets">Tickets</Link>
          <Link href="/#faq">Fragen</Link>
        </nav>
      </div>
    </header>
  );
}
