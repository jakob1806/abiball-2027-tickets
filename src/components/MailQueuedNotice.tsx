"use client";

import { useEffect, useRef, useState } from "react";

/** Pop-up, wenn die Ticketmail wegen des Tageslimits erst später verschickt wird. */
export default function MailQueuedNotice({ email }: { email: string }) {
  const [open, setOpen] = useState(true);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  if (!open) {
    return (
      <div className="note" style={{ marginTop: 24, maxWidth: 640 }}>
        Deine Bestätigungsmail an {email} kommt später. Deine Tickets unten sind schon gültig.
      </div>
    );
  }

  return (
    <div className="modal-backdrop" role="presentation" onClick={() => setOpen(false)}>
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="mq-title" onClick={(e) => e.stopPropagation()}>
        <h2 id="mq-title" className="h3">Deine Tickets sind da, die Mail kommt etwas später</h2>
        <p>
          Gerade gehen sehr viele Bestellungen ein, deshalb verschicken wir die Bestätigungsmail an <strong>{email}</strong> mit
          etwas Verzögerung, spätestens morgen früh.
        </p>
        <p>
          <strong>Deine Tickets sind bereits gültig.</strong> Du findest sie unten auf dieser Seite, kannst sie als PDF laden oder in
          dein Wallet legen. Speichere dir am besten den Link zu dieser Seite.
        </p>
        <button ref={closeRef} className="btn block" onClick={() => setOpen(false)}>Verstanden</button>
      </div>
    </div>
  );
}
