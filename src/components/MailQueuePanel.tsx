"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function MailQueuePanel({ count }: { count: number }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  if (count === 0 && !msg) return null;

  async function run() {
    setBusy(true);
    const res = await fetch("/api/admin/mail-queue", { method: "POST" });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    setMsg(data.message ?? data.error ?? "Fehler");
    router.refresh();
  }

  return (
    <div className="note row" style={{ justifyContent: "space-between", marginTop: 16 }}>
      <span>
        <strong>{count} {count === 1 ? "Ticket-Mail wartet" : "Ticket-Mails warten"}</strong> auf den Versand (Tageslimit des Mailanbieters).
        Sie gehen automatisch raus, spätestens morgen früh.{msg && <><br />{msg}</>}
      </span>
      <button className="btn small" onClick={run} disabled={busy}>{busy ? "Sende …" : "Jetzt senden"}</button>
    </div>
  );
}
