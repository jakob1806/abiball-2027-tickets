"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    if (res.ok) {
      const next = params.get("weiter");
      router.replace(next && next.startsWith("/admin") ? next : "/admin");
      router.refresh();
    } else {
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      setError(res.status === 429 && data.error ? data.error : "Falsches Passwort.");
      setBusy(false);
    }
  }

  return (
    <form className="form" onSubmit={submit}>
      <label className="field">
        Passwort
        <input type="password" autoFocus autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
      </label>
      {error && <div className="alert">{error}</div>}
      <button className="btn block" disabled={busy}>{busy ? "Prüfe …" : "Anmelden"}</button>
    </form>
  );
}

export default function LoginPage() {
  return (
    <main className="hero">
      <div className="wrap" style={{ maxWidth: 420 }}>
        <p className="eyebrow">Abiball 2027</p>
        <h1 className="h1">Admin</h1>
        <Suspense>
          <LoginForm />
        </Suspense>
      </div>
    </main>
  );
}
