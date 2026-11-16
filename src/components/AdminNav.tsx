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

  const link = (href: string, label: string) => (
    <Link href={href} style={{ color: path === href ? "#000" : undefined }}>{label}</Link>
  );

  return (
    <header className="top admin-top">
      <div className="wrap">
        <Link href="/admin" className="brand">Abiball 2027 · Admin</Link>
        <nav className="nav">
          {link("/admin", "Übersicht")}
          {link("/admin/neu", "Neue Buchung")}
          {link("/admin/scanner", "Einlass")}
          <a href="/api/admin/export">Excel</a>
          <button onClick={logout} style={{ background: "none", border: 0, font: "inherit", color: "var(--muted)", cursor: "pointer", padding: 0 }}>
            Abmelden
          </button>
        </nav>
      </div>
    </header>
  );
}
