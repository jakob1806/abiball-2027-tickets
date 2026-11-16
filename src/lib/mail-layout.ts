// Gemeinsames Layout für alle E-Mails (Tabellen + Inline-Styles für maximale Kompatibilität
// mit Gmail, Outlook, Apple Mail). Schwarz-weiß, schlicht – wie die Website.

import { EVENT } from "./event";
import { siteUrl } from "./env";

const FONT = "-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif";
const SERIF = "Georgia,'Times New Roman',Times,serif";

export function esc(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

export function paragraph(html: string, opts: { muted?: boolean; small?: boolean } = {}): string {
  const size = opts.small ? 14 : 16;
  const color = opts.muted ? "#6b6b6b" : "#000000";
  return `<p style="margin:0 0 16px;font-family:${FONT};font-size:${size}px;line-height:1.55;color:${color}">${html}</p>`;
}

export function button(href: string, label: string, variant: "primary" | "ghost" = "primary"): string {
  const styles =
    variant === "primary"
      ? "background:#000000;color:#ffffff;border:1.5px solid #000000"
      : "background:#ffffff;color:#000000;border:1.5px solid #000000";
  return `<a href="${esc(href)}" style="display:inline-block;${styles};text-decoration:none;padding:13px 22px;border-radius:999px;font-family:${FONT};font-size:15px;font-weight:600;margin:0 8px 10px 0">${esc(label)}</a>`;
}

/** Schlüssel/Wert-Liste, z. B. Datum, Ort, Betrag. */
export function infoTable(rows: [string, string][]): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin:0 0 20px">
  ${rows
    .map(
      ([k, v]) => `<tr>
    <td style="padding:10px 0;border-top:1px solid #e6e6e6;font-family:${FONT};font-size:13px;color:#6b6b6b;width:38%;vertical-align:top">${esc(k)}</td>
    <td style="padding:10px 0;border-top:1px solid #e6e6e6;font-family:${FONT};font-size:15px;color:#000000;vertical-align:top">${v}</td>
  </tr>`,
    )
    .join("")}
</table>`;
}

/** Ticketliste: Ball = schwarze Marke, Afterparty = gestrichelte Marke. */
export function ticketList(tickets: { number: string; typeId: string; typeName: string; holder: string; admission: string }[]): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:separate;border-spacing:0 8px;margin:0 0 12px">
  ${tickets
    .map((t) => {
      const ball = t.typeId === "ball";
      const badge = ball
        ? "background:#000000;color:#ffffff;border:1.5px solid #000000"
        : "background:#ffffff;color:#000000;border:1.5px dashed #000000";
      return `<tr>
    <td style="padding:14px 16px;border:1px solid #e6e6e6;border-radius:12px">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
        <td style="vertical-align:middle">
          <div style="font-family:${FONT};font-size:16px;font-weight:600;color:#000000">${esc(t.holder)}</div>
          <div style="font-family:${FONT};font-size:13px;color:#6b6b6b;margin-top:2px">${esc(t.typeName)} · ${esc(t.admission)}</div>
        </td>
        <td style="vertical-align:middle;text-align:right;white-space:nowrap">
          <span style="display:inline-block;${badge};border-radius:999px;padding:5px 12px;font-family:Menlo,Consolas,monospace;font-size:13px;font-weight:700">${esc(t.number)}</span>
        </td>
      </tr></table>
    </td>
  </tr>`;
    })
    .join("")}
</table>`;
}

export function noteBox(html: string): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px"><tr>
  <td style="background:#f5f5f5;border-radius:12px;padding:16px 18px;font-family:${FONT};font-size:14px;line-height:1.55;color:#000000">${html}</td>
</tr></table>`;
}

export function heading(text: string, level: 1 | 2 = 2): string {
  return level === 1
    ? `<h1 style="margin:0 0 18px;font-family:${FONT};font-size:34px;line-height:1.08;letter-spacing:-0.02em;color:#000000">${esc(text)}</h1>`
    : `<h2 style="margin:28px 0 12px;font-family:${FONT};font-size:13px;letter-spacing:0.06em;text-transform:uppercase;color:#6b6b6b">${esc(text)}</h2>`;
}

/** Vollständige Mail: Kopf mit Schul-Logo, Inhalt, Fuß mit Rechtslinks. */
export function layout({ preheader, body }: { preheader: string; body: string }): string {
  const base = siteUrl();
  return `<!doctype html>
<html lang="de">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light only">
<meta name="supported-color-schemes" content="light">
<title>${esc(EVENT.title)}</title>
</head>
<body style="margin:0;padding:0;background:#f2f2f2">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent">${esc(preheader)}&#8199;&#65279;&#847;&#8199;&#65279;&#847;</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f2f2f2">
<tr><td align="center" style="padding:28px 12px">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:580px;background:#ffffff;border-radius:16px">
    <tr><td align="center" style="padding:32px 28px 8px">
      <img src="${base}/images/mail-crest.png" width="96" height="58" alt="Wappen" style="display:block;border:0;width:96px;height:auto">
      <div style="font-family:${SERIF};font-size:14px;letter-spacing:0.12em;color:#1a1a1a;margin-top:12px">WITTELSBACHER-GYMNASIUM</div>
      <div style="font-family:${SERIF};font-size:11px;letter-spacing:0.22em;color:#1a1a1a;margin-top:3px">MÜNCHEN</div>
    </td></tr>
    <tr><td style="padding:0 28px"><div style="border-top:1px solid #e6e6e6;margin:20px 0 28px"></div></td></tr>
    <tr><td style="padding:0 28px 12px">
      ${body}
    </td></tr>
    <tr><td style="padding:8px 28px 30px">
      <div style="border-top:1px solid #e6e6e6;padding-top:18px;font-family:${FONT};font-size:12px;line-height:1.6;color:#6b6b6b">
        ${esc(EVENT.title)} · ${esc(EVENT.dateLabel)} · ${esc(EVENT.venueName)}<br>
        Veranstalter: ${esc(EVENT.organizer)} – keine Schulveranstaltung.<br>
        <a href="${base}/impressum" style="color:#6b6b6b">Impressum</a> &nbsp;·&nbsp;
        <a href="${base}/datenschutz" style="color:#6b6b6b">Datenschutz</a> &nbsp;·&nbsp;
        <a href="${base}/agb" style="color:#6b6b6b">AGB</a>
      </div>
    </td></tr>
  </table>
</td></tr>
</table>
</body>
</html>`;
}

export function mapsUrl(): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${EVENT.venueStreet.replace(", 4. Stock", "")}, ${EVENT.venueCity}`)}`;
}
