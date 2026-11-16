"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

export default function AdminNav() {
  const router = useRouter();
  const path = usePathname();
  if (path === "/admin/login") return null;

  async function logout() {
    await fetch("/api/admin/logout", { method: "POST" });
    router.replace("/admin/login");
    router.refresh();
  }

  const active = (href: string) => (href === "/admin" ? path === "/admin" : path.startsWith(href));
  const link = (href: string, label: string) => (
    <Link href={href} className={active(href) ? "active" : undefined}>{label}</Link>
  );

  return (
    <header className="top admin-top">
      <div className="wrap">
        <Link href="/admin" className="brand">Abiball 2027 <span className="muted" style={{ fontWeight: 400 }}>Admin</span></Link>
        <nav className="nav admin-nav">
          {link("/admin", "Übersicht")}
          {link("/admin/buchungen", "Buchungen")}
          {link("/admin/gaesteliste", "Gästeliste")}
          {link("/admin/neu", "Neue Buchung")}
          {link("/admin/scanner", "Einlass")}
          {link("/admin/einstellungen", "Einstellungen")}
          <button onClick={logout} style={{ background: "none", border: 0, font: "inherit", color: "var(--muted)", cursor: "pointer", padding: 0 }}>
            Abmelden
          </button>
        </nav>
      </div>
    </header>
  );
}
