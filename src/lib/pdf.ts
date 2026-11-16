import "server-only";
import { PDFDocument, PDFFont, PDFPage, StandardFonts, rgb } from "pdf-lib";
import { EVENT } from "./event";
import { siteUrl } from "./env";
import { qrPng } from "./qr";
import { CREST_PRINT_PNG_BASE64 } from "./wallet-assets";
import type { Order, Ticket, TicketType } from "./types";

const A4: [number, number] = [595.28, 841.89];
const BLACK = rgb(0, 0, 0);
const WHITE = rgb(1, 1, 1);
const GREY = rgb(0.45, 0.45, 0.45);
const LIGHT = rgb(0.86, 0.86, 0.86);
const SOFT = rgb(0.965, 0.965, 0.965);

/** Text mit Zeichenabstand zentriert setzen (für den Schriftzug der Schule). */
function drawSpaced(page: PDFPage, text: string, font: PDFFont, size: number, cx: number, y: number, spacing: number, color = BLACK) {
  const widths = [...text].map((c) => font.widthOfTextAtSize(c, size));
  const total = widths.reduce((a, b) => a + b, 0) + spacing * (text.length - 1);
  let x = cx - total / 2;
  [...text].forEach((c, i) => {
    page.drawText(c, { x, y, size, font, color });
    x += widths[i] + spacing;
  });
}

/** Rechteck mit abgerundeten Ecken als SVG-Pfad (pdf-lib-Koordinaten: y nach oben). */
function roundedRect(page: PDFPage, x: number, y: number, w: number, h: number, r: number, opts: { fill?: ReturnType<typeof rgb>; border?: ReturnType<typeof rgb>; borderWidth?: number; dash?: number[] }) {
  const path = `M ${r} 0 H ${w - r} A ${r} ${r} 0 0 1 ${w} ${r} V ${h - r} A ${r} ${r} 0 0 1 ${w - r} ${h} H ${r} A ${r} ${r} 0 0 1 0 ${h - r} V ${r} A ${r} ${r} 0 0 1 ${r} 0 Z`;
  // drawSvgPath zeichnet mit y nach unten ab dem Startpunkt (x, y oben links)
  page.drawSvgPath(path, {
    x,
    y: y + h,
    color: opts.fill,
    borderColor: opts.border,
    borderWidth: opts.borderWidth,
    borderDashArray: opts.dash,
  });
}

function wrap(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let line = "";
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (font.widthOfTextAtSize(test, size) > maxWidth && line) {
      lines.push(line);
      line = w;
    } else line = test;
  }
  if (line) lines.push(line);
  return lines;
}

/** Erzeugt eine PDF-Datei mit einer Seite pro Ticket. */
export async function buildTicketsPdf(
  order: Order,
  tickets: Ticket[],
  types: Record<string, TicketType>,
): Promise<Buffer> {
  const pdf = await PDFDocument.create();
  pdf.setTitle(`${EVENT.title} – Tickets`);
  pdf.setAuthor(EVENT.organizer);
  pdf.setSubject(`${EVENT.dateLabel}, ${EVENT.venueName}`);

  const sans = await pdf.embedFont(StandardFonts.Helvetica);
  const sansBold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const serif = await pdf.embedFont(StandardFonts.TimesRoman);
  const mono = await pdf.embedFont(StandardFonts.CourierBold);
  const crest = await pdf.embedPng(Buffer.from(CREST_PRINT_PNG_BASE64, "base64"));

  for (const [index, ticket] of tickets.entries()) {
    const page = pdf.addPage(A4);
    const { width, height } = page.getSize();
    const m = 48;
    const cx = width / 2;
    const type = types[ticket.ticket_type_id];
    const isBall = ticket.ticket_type_id === "ball";
    const valid = ticket.status === "valid" && order.status === "paid";

    // ---------- Kopf: Schul-Logo ----------
    const crestW = 78;
    const crestH = (crest.height / crest.width) * crestW;
    const crestY = height - m - crestH;
    page.drawImage(crest, { x: cx - crestW / 2, y: crestY, width: crestW, height: crestH });
    drawSpaced(page, "WITTELSBACHER-GYMNASIUM", serif, 13, cx, crestY - 20, 1.2, rgb(0.1, 0.1, 0.1));
    drawSpaced(page, "MÜNCHEN", serif, 10, cx, crestY - 34, 2.2, rgb(0.1, 0.1, 0.1));

    // ---------- Titel ----------
    let y = crestY - 64;
    page.drawLine({ start: { x: m, y }, end: { x: width - m, y }, thickness: 0.6, color: LIGHT });
    y -= 50;
    page.drawText(EVENT.title, { x: m, y, size: 40, font: sansBold, color: BLACK });
    const dateTxt = "Fr, 25.06.2027";
    page.drawText(dateTxt, { x: width - m - sansBold.widthOfTextAtSize(dateTxt, 14), y: y + 18, size: 14, font: sansBold, color: BLACK });
    const sub = `Abiturjahrgang 2027 · Ticket ${index + 1} von ${tickets.length}`;
    page.drawText(sub, { x: width - m - sans.widthOfTextAtSize(sub, 9), y: y + 2, size: 9, font: sans, color: GREY });

    // ---------- Ticketkarte ----------
    const cardX = m;
    const cardW = width - 2 * m;
    const cardTop = y - 26;
    const cardH = 400;
    const cardY = cardTop - cardH;
    roundedRect(page, cardX, cardY, cardW, cardH, 14, { border: BLACK, borderWidth: 1.2 });

    // Band: Ball = schwarz gefüllt, Afterparty = gestrichelt
    const bandH = 58;
    const bandY = cardTop - bandH;
    if (isBall) {
      page.drawSvgPath(`M 14 0 H ${cardW - 14} A 14 14 0 0 1 ${cardW} 14 V ${bandH} H 0 V 14 A 14 14 0 0 1 14 0 Z`, { x: cardX, y: cardTop, color: BLACK });
    } else {
      page.drawLine({ start: { x: cardX + 1, y: bandY }, end: { x: cardX + cardW - 1, y: bandY }, thickness: 1.2, color: BLACK, dashArray: [6, 4] });
    }
    const bandColor = isBall ? WHITE : BLACK;
    const typeLabel = isBall ? "BALL" : "AFTERPARTY";
    page.drawText(typeLabel, { x: cardX + 22, y: bandY + 21, size: 22, font: sansBold, color: bandColor });
    const adm = isBall ? "Einlass ab 19:00 Uhr" : "Einlass ab 22:30 Uhr";
    page.drawText(adm, { x: cardX + 22 + sansBold.widthOfTextAtSize(typeLabel, 22) + 14, y: bandY + 23, size: 11, font: sans, color: bandColor });
    const no = ticket.ticket_number ?? "";
    page.drawText(no, { x: cardX + cardW - 22 - mono.widthOfTextAtSize(no, 22), y: bandY + 20, size: 22, font: mono, color: bandColor });

    // Linke Spalte: Angaben
    const colX = cardX + 22;
    const qrSize = 196;
    const qrBoxX = cardX + cardW - 22 - qrSize - 16;
    const colW = qrBoxX - colX - 20;
    let ly = bandY - 38;
    const field = (label: string, value: string, opts: { big?: boolean; lines?: string[] } = {}) => {
      page.drawText(label.toUpperCase(), { x: colX, y: ly, size: 7.5, font: sansBold, color: GREY });
      ly -= opts.big ? 22 : 16;
      const lines = opts.lines ?? wrap(value, opts.big ? sansBold : sans, opts.big ? 19 : 11.5, colW);
      for (const l of lines) {
        page.drawText(l, { x: colX, y: ly, size: opts.big ? 19 : 11.5, font: opts.big ? sansBold : sans, color: BLACK });
        ly -= opts.big ? 22 : 15;
      }
      ly -= 12;
    };
    field("Name", ticket.holder_name, { big: true });
    field("Ticket", `${type?.name ?? ticket.ticket_type_id} · Nr. ${no}`);
    field("Datum und Zeit", `${EVENT.dateLabel}, ${isBall ? "19:00" : "22:30"} bis 04:00 Uhr`);
    field("Ort", "", { lines: [EVENT.venueName, EVENT.venueStreet, EVENT.venueCity] });
    field("Enthalten", isBall ? "Buffet, Programm und Afterparty" : "Afterparty");

    // Rechte Spalte: QR-Code in hellem Feld
    const qrBoxW = qrSize + 32;
    const qrBoxH = qrSize + 70;
    const qrBoxY = bandY - 24 - qrBoxH;
    roundedRect(page, qrBoxX, qrBoxY, qrBoxW, qrBoxH, 10, { fill: SOFT });
    const qr = await pdf.embedPng(await qrPng(ticket.code, 700));
    page.drawImage(qr, { x: qrBoxX + 16, y: qrBoxY + 54, width: qrSize, height: qrSize });
    const codeW = mono.widthOfTextAtSize(ticket.code, 11);
    page.drawText(ticket.code, { x: qrBoxX + qrBoxW / 2 - codeW / 2, y: qrBoxY + 34, size: 11, font: mono, color: BLACK });
    const hint = "Einmal gültig · am Einlass zeigen";
    page.drawText(hint, { x: qrBoxX + qrBoxW / 2 - sans.widthOfTextAtSize(hint, 8) / 2, y: qrBoxY + 18, size: 8, font: sans, color: GREY });

    if (!valid) {
      const v = "UNGÜLTIG";
      page.drawText(v, { x: cx - sansBold.widthOfTextAtSize(v, 60) / 2, y: cardY + cardH / 2 - 20, size: 60, font: sansBold, color: rgb(0.8, 0, 0), opacity: 0.85 });
    }

    // Fuß der Karte: Besteller
    const orderLine = `Bestellt von ${order.buyer_name}`;
    page.drawLine({ start: { x: cardX + 22, y: cardY + 40 }, end: { x: cardX + cardW - 22, y: cardY + 40 }, thickness: 0.5, color: LIGHT });
    page.drawText(orderLine, { x: cardX + 22, y: cardY + 20, size: 9, font: sans, color: GREY });
    const web = new URL(siteUrl()).host;
    page.drawText(web, { x: cardX + cardW - 22 - sans.widthOfTextAtSize(web, 9), y: cardY + 20, size: 9, font: sans, color: GREY });

    // ---------- Hinweise ----------
    let hy = cardY - 34;
    page.drawText("GUT ZU WISSEN", { x: m, y: hy, size: 7.5, font: sansBold, color: GREY });
    hy -= 16;
    const notes = [
      "Jeder QR-Code gilt für genau einen Einlass. Kopien oder Screenshots werden nach dem ersten Scan abgewiesen.",
      "Bitte einen Lichtbildausweis mitbringen. Unter 16 Jahren nur mit Begleitung, unter 18 Jahren ohne erziehungsbeauftragte Person nur bis 24 Uhr.",
      `Anfahrt: ${EVENT.venueName}, ${EVENT.venueStreet}, ${EVENT.venueCity} – am besten mit S- oder U-Bahn bis Ostbahnhof.`,
    ];
    for (const n of notes) {
      const lines = wrap(n, sans, 9.5, width - 2 * m - 12);
      page.drawCircle({ x: m + 3, y: hy + 3, size: 1.6, color: BLACK });
      for (const l of lines) {
        page.drawText(l, { x: m + 12, y: hy, size: 9.5, font: sans, color: BLACK });
        hy -= 13;
      }
      hy -= 5;
    }

    // ---------- Fußzeile ----------
    page.drawLine({ start: { x: m, y: 52 }, end: { x: width - m, y: 52 }, thickness: 0.5, color: LIGHT });
    const foot = `Veranstalter: ${EVENT.organizer} · keine Schulveranstaltung`;
    page.drawText(foot, { x: m, y: 36, size: 8, font: sans, color: GREY });
  }

  return Buffer.from(await pdf.save());
}
