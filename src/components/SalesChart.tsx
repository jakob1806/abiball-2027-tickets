"use client";

import { useState } from "react";

interface Point { day: string; tickets: number; cents: number }

const euro = (c: number) => new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(c / 100);
const label = (d: string) => new Date(`${d}T12:00:00`).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" });

/** Tickets pro Tag (eine Reihe, schwarze Balken, Hover-Tooltip, Tabellen-Fallback). */
export default function SalesChart({ days }: { days: Point[] }) {
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(4, ...days.map((d) => d.tickets));
  const W = 720, H = 180, padL = 28, padB = 22, padT = 8;
  const plotW = W - padL, plotH = H - padB - padT;
  const slot = plotW / days.length;
  const barW = Math.max(4, slot - 2); // 2px Abstand zwischen Balken
  const ticks = [0, Math.round(max / 2), max];
  const total = days.reduce((s, d) => s + d.tickets, 0);

  return (
    <figure className="chart" style={{ margin: 0 }}>
      <figcaption className="chart-head">
        <span className="h3" style={{ margin: 0 }}>Verkaufte Tickets pro Tag</span>
        <span className="small muted">letzte 30 Tage · {total} Tickets</span>
      </figcaption>
      <div className="chart-box" onMouseLeave={() => setHover(null)}>
        <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Verkaufte Tickets pro Tag, letzte 30 Tage, insgesamt ${total}`} style={{ width: "100%", height: "auto", display: "block" }}>
          {ticks.map((t) => {
            const y = padT + plotH - (t / max) * plotH;
            return (
              <g key={t}>
                <line x1={padL} x2={W} y1={y} y2={y} stroke="#ececec" strokeWidth={1} />
                <text x={padL - 6} y={y + 4} textAnchor="end" fontSize="11" fill="#8a8a8a">{t}</text>
              </g>
            );
          })}
          {days.map((d, i) => {
            const h = (d.tickets / max) * plotH;
            const x = padL + i * slot + 1;
            const y = padT + plotH - h;
            const r = Math.min(4, barW / 2, h);
            return (
              <g key={d.day} onMouseEnter={() => setHover(i)} onFocus={() => setHover(i)} tabIndex={0}>
                {/* großes Hover-Ziel */}
                <rect x={padL + i * slot} y={padT} width={slot} height={plotH} fill="transparent" />
                {h > 0 && (
                  <path
                    d={`M${x},${padT + plotH} L${x},${y + r} Q${x},${y} ${x + r},${y} L${x + barW - r},${y} Q${x + barW},${y} ${x + barW},${y + r} L${x + barW},${padT + plotH} Z`}
                    fill={hover === null || hover === i ? "#000" : "#bdbdbd"}
                  />
                )}
                {(i % 5 === 0 || i === days.length - 1) && (
                  <text x={x + barW / 2} y={H - 6} textAnchor="middle" fontSize="11" fill="#8a8a8a">{label(d.day)}</text>
                )}
              </g>
            );
          })}
        </svg>
        {hover !== null && (
          <div
            className="chart-tip"
            style={{ left: `${((padL + hover * slot + slot / 2) / W) * 100}%` }}
            role="status"
          >
            <strong>{days[hover].tickets} Tickets</strong>
            <span>{label(days[hover].day)} · {euro(days[hover].cents)}</span>
          </div>
        )}
      </div>
      <details className="small muted" style={{ marginTop: 8 }}>
        <summary>Als Tabelle</summary>
        <table style={{ marginTop: 8 }}>
          <thead><tr><th>Tag</th><th>Tickets</th><th>Umsatz</th></tr></thead>
          <tbody>
            {days.filter((d) => d.tickets > 0).map((d) => (
              <tr key={d.day}><td>{label(d.day)}</td><td>{d.tickets}</td><td>{euro(d.cents)}</td></tr>
            ))}
            {total === 0 && <tr><td colSpan={3}>Noch keine Verkäufe.</td></tr>}
          </tbody>
        </table>
      </details>
    </figure>
  );
}
