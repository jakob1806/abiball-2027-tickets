// Erzeugt die Apple-Wallet-Grafiken aus dem Wappen (public/images/wappen-bayern.svg)
// und schreibt sie als Base64 nach src/lib/wallet-assets.ts.
// Aufruf: node scripts/wallet-assets.mjs
import { readFileSync, writeFileSync } from "node:fs";
import { Resvg } from "@resvg/resvg-js";

const svg = readFileSync(new URL("../public/images/wappen-bayern.svg", import.meta.url), "utf8");
const inner = svg.replace(/^[\s\S]*?<svg[^>]*>/, "").replace(/<\/svg>\s*$/, "");
const VB_W = 71.13, VB_H = 43.1; // viewBox des Wappens

/** Wappen zentriert auf einer Fläche (optional mit Hintergrundfarbe) rendern. */
function render(w, h, { pad = 0, bg = null } = {}) {
  const scale = Math.min((w - 2 * pad) / VB_W, (h - 2 * pad) / VB_H);
  const cw = VB_W * scale, ch = VB_H * scale;
  const x = (w - cw) / 2, y = (h - ch) / 2;
  const doc = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
    ${bg ? `<rect width="${w}" height="${h}" fill="${bg}"/>` : ""}
    <g transform="translate(${x} ${y}) scale(${scale})">${inner}</g>
  </svg>`;
  return Buffer.from(new Resvg(doc, { fitTo: { mode: "original" } }).render().asPng()).toString("base64");
}

const assets = {
  // Logo oben links im Pass: max. 160×50 pt → Wappen auf 50 pt Höhe
  "logo.png": render(83, 50),
  "logo@2x.png": render(166, 100),
  "logo@3x.png": render(249, 150),
  // App-Symbol (Mitteilungen, Sperrbildschirm): quadratisch, weißer Grund
  "icon.png": render(29, 29, { pad: 2, bg: "#ffffff" }),
  "icon@2x.png": render(58, 58, { pad: 4, bg: "#ffffff" }),
  "icon@3x.png": render(87, 87, { pad: 6, bg: "#ffffff" }),
};

// Wappen in Druckauflösung für das PDF-Ticket (transparent)
const printCrest = render(640, 388);

const out = `// Automatisch erzeugt von scripts/wallet-assets.mjs – nicht von Hand bearbeiten.
// Quelle: Großes Bayerisches Staatswappen (Wikimedia Commons, gemeinfrei nach § 5 UrhG)
export const WALLET_ASSETS_BASE64: Record<string, string> = ${JSON.stringify(assets, null, 2)};

/** Wappen 640×388 px, transparent – für das PDF-Ticket. */
export const CREST_PRINT_PNG_BASE64 = ${JSON.stringify(printCrest)};
`;
writeFileSync(new URL("../src/lib/wallet-assets.ts", import.meta.url), out);
for (const [k, v] of Object.entries(assets)) console.log(k, Math.round((v.length * 3) / 4 / 1024), "KB");
