"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Html5Qrcode } from "html5-qrcode";

interface Result {
  result: "ok" | "duplicate" | "invalid" | "cancelled";
  code: string;
  holder_name: string | null;
  ticket_type_name: string | null;
  ticket_type_id?: string | null;
  ticket_number?: string | null;
  checked_in_by_label?: string | null;
  checked_in_at: string | null;
}

const TITLE: Record<Result["result"], string> = {
  ok: "Einlass OK",
  duplicate: "Bereits eingelassen",
  invalid: "Unbekannter Code",
  cancelled: "Ticket ungültig",
};

function time(iso: string | null) {
  return iso ? new Date(iso).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit", second: "2-digit" }) : "";
}

function feedback(ok: boolean) {
  try {
    navigator.vibrate?.(ok ? 80 : [200, 80, 200]);
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new Ctx();
    const osc = ctx.createOscillator();
    osc.frequency.value = ok ? 880 : 220;
    osc.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + (ok ? 0.12 : 0.4));
  } catch {
    /* ohne Ton */
  }
}

export default function Scanner({
  checkinUrl = "/api/admin/checkin",
  statsUrl = "/api/admin/checkin",
  onUnauthorized = () => window.location.assign("/admin/login?weiter=/admin/scanner"),
}: {
  checkinUrl?: string;
  statsUrl?: string;
  onUnauthorized?: () => void;
} = {}) {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const lastRef = useRef<{ code: string; at: number }>({ code: "", at: 0 });
  const busyRef = useRef(false);
  const [running, setRunning] = useState(false);
  const [camError, setCamError] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [manual, setManual] = useState("");
  const [history, setHistory] = useState<Result[]>([]);
  const [counter, setCounter] = useState<{ inside: number; total?: number; sold?: number; capacity?: number } | null>(null);

  const refreshCounter = useCallback(async () => {
    try {
      const res = await fetch(statsUrl, { cache: "no-store" });
      if (res.ok) setCounter(await res.json());
    } catch {
      /* offline */
    }
  }, [statsUrl]);

  useEffect(() => {
    void refreshCounter();
    const id = setInterval(() => void refreshCounter(), 15000); // mehrere Scanner gleichzeitig
    return () => clearInterval(id);
  }, [refreshCounter]);

  const check = useCallback(async (code: string) => {
    const now = Date.now();
    if (busyRef.current) return;
    if (lastRef.current.code === code && now - lastRef.current.at < 4000) return; // gleicher Code direkt hintereinander
    lastRef.current = { code, at: now };
    busyRef.current = true;
    try {
      const res = await fetch(checkinUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      if (res.status === 401) {
        onUnauthorized();
        return;
      }
      const data = (await res.json()) as Result;
      setResult(data);
      setHistory((h) => [data, ...h].slice(0, 15));
      feedback(data.result === "ok");
      if (data.result === "ok") void refreshCounter();
    } catch {
      setResult({ result: "invalid", code, holder_name: null, ticket_type_name: null, checked_in_at: null });
      feedback(false);
    } finally {
      busyRef.current = false;
    }
  }, [refreshCounter, checkinUrl, onUnauthorized]);

  async function start() {
    setCamError(null);
    try {
      const { Html5Qrcode, Html5QrcodeSupportedFormats } = await import("html5-qrcode");
      const scanner = new Html5Qrcode("reader", { formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE], verbose: false });
      scannerRef.current = scanner;
      await scanner.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: (w, h) => { const s = Math.floor(Math.min(w, h) * 0.7); return { width: s, height: s }; } },
        (text) => void check(text),
        () => {},
      );
      setRunning(true);
    } catch (err) {
      setCamError(err instanceof Error ? err.message : "Kamera nicht verfügbar. HTTPS und Kamerafreigabe prüfen.");
    }
  }

  async function stop() {
    try {
      await scannerRef.current?.stop();
      scannerRef.current?.clear();
    } catch {
      /* bereits gestoppt */
    }
    setRunning(false);
  }

  useEffect(() => () => void scannerRef.current?.stop().catch(() => {}), []);

  return (
    <div className="form">
      {counter && (
        <div className="meter-row" style={{ margin: 0 }}>
          <div className="meter-label">
            <strong>{counter.inside} drin</strong>
            <span className="muted">von {counter.total ?? counter.sold} Tickets{counter.capacity ? ` · Kapazität ${counter.capacity}` : ""}</span>
          </div>
          <div className="meter"><span style={{ width: `${(counter.total ?? counter.sold) ? Math.round((counter.inside / (counter.total ?? counter.sold ?? 1)) * 100) : 0}%` }} /></div>
        </div>
      )}
      <div id="reader" style={{ minHeight: running ? 0 : 0 }} />
      <div className="row">
        {!running ? (
          <button className="btn" onClick={start}>Kamera starten</button>
        ) : (
          <button className="btn ghost" onClick={stop}>Kamera stoppen</button>
        )}
      </div>
      {camError && <div className="alert">{camError}</div>}

      {result && (
        <div className={`scan-result ${result.result}`} role="status" aria-live="assertive">
          <div className="big">{TITLE[result.result]}</div>
          {result.ticket_type_name && (
            <div className={`scan-type ${result.ticket_type_id === "ball" ? "scan-type-ball" : "scan-type-after"}`}>
              {result.ticket_number ? `${result.ticket_number} · ` : ""}{result.ticket_type_name}
            </div>
          )}
          {result.holder_name && <div style={{ fontSize: 22, marginTop: 8 }}>{result.holder_name}</div>}
          {result.result === "ok" && result.ticket_type_id && result.ticket_type_id !== "ball" && (
            <div style={{ marginTop: 6, fontWeight: 600 }}>Nur Afterparty – Einlass ab 22:30 Uhr</div>
          )}
          {result.result === "duplicate" && (
            <div>Erster Einlass um {time(result.checked_in_at)} Uhr{result.checked_in_by_label ? ` durch ${result.checked_in_by_label}` : ""}</div>
          )}
          <div className="mono small" style={{ marginTop: 8, opacity: 0.85 }}>{result.code}</div>
        </div>
      )}

      <form
        className="row"
        onSubmit={(e) => {
          e.preventDefault();
          if (manual.trim()) {
            lastRef.current = { code: "", at: 0 };
            void check(manual.trim());
            setManual("");
          }
        }}
      >
        <input
          type="text"
          placeholder="Code manuell, z. B. WG27-ABCD-EFGH-JKLM"
          value={manual}
          onChange={(e) => setManual(e.target.value.toUpperCase())}
          autoCapitalize="characters"
          autoComplete="off"
          style={{ flex: 1, minWidth: 220 }}
        />
        <button className="btn">Prüfen</button>
      </form>

      {history.length > 0 && (
        <div>
          <div className="small muted" style={{ marginBottom: 8 }}>Letzte Scans</div>
          <div className="table-wrap">
            <table>
              <tbody>
                {history.map((h, i) => (
                  <tr key={i}>
                    <td><span className={`badge ${h.result === "ok" ? "ok" : h.result === "duplicate" ? "warn" : "bad"}`}>{TITLE[h.result]}</span></td>
                    <td className="ticket-no small">{h.ticket_number ?? "–"}</td>
                    <td>{h.holder_name ?? "–"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
