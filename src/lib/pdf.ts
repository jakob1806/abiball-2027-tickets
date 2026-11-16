import "server-only";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { EVENT } from "./event";
import { euro } from "./format";
import { qrPng } from "./qr";
import type { Order, Ticket, TicketType } from "./types";

const A4: [number, number] = [595.28, 841.89];
const BLACK = rgb(0, 0, 0);
const GREY = rgb(0.42, 0.42, 0.42);
const LINE = rgb(0.88, 0.88, 0.88);

/** Erzeugt eine PDF-Datei mit einer Seite pro Ticket. */
export async function buildTicketsPdf(
  order: Order,
  tickets: Ticket[],
  types: Record<string, TicketType>,
): Promise<Buffer> {
  const pdf = await PDFDocument.create();
  pdf.setTitle(`${EVENT.title} – Tickets`);
  pdf.setAuthor(EVENT.organizer);
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);

  for (const [index, ticket] of tickets.entries()) {
    const page = pdf.addPage(A4);
    const { width, height } = page.getSize();
    const m = 56;
    let y = height - m;

    const type = types[ticket.ticket_type_id];

    const isBall = ticket.ticket_type_id === "ball";
    // Kopfband: Ball = schwarz gefüllt, Afterparty = weiß mit Rahmen
    const bandH = 54;
    const bandY = height - m - bandH + 10;
    if (isBall) {
      page.drawRectangle({ x: m, y: bandY, width: width - 2 * m, height: bandH, color: BLACK });
    } else {
      page.drawRectangle({ x: m, y: bandY, width: width - 2 * m, height: bandH, borderColor: BLACK, borderWidth: 2, borderDashArray: [6, 4] });
    }
    const bandColor = isBall ? rgb(1, 1, 1) : BLACK;
    const label = (type?.name ?? ticket.ticket_type_id).toUpperCase();
    page.drawText(label, { x: m + 18, y: bandY + 19, size: 20, font: bold, color: bandColor });
    const no = ticket.ticket_number ?? "";
    const noW = bold.widthOfTextAtSize(no, 22);
    page.drawText(no, { x: width - m - 18 - noW, y: bandY + 18, size: 22, font: bold, color: bandColor });
    y = bandY - 22;
    page.drawText(`Ticket ${index + 1} von ${tickets.length}`, { x: m, y, size: 10, font: regular, color: GREY });
    y -= 56;
    page.drawText(EVENT.title, { x: m, y, size: 44, font: bold, color: BLACK });
    y -= 30;
    page.drawText(EVENT.school, { x: m, y, size: 13, font: regular, color: GREY });
    y -= 40;
    page.drawLine({ start: { x: m, y }, end: { x: width - m, y }, thickness: 1, color: LINE });
    y -= 36;

    const rows: [string, string][] = [
      ["Ticket", `${type?.name ?? ticket.ticket_type_id}${ticket.ticket_number ? `  ·  Nr. ${ticket.ticket_number}` : ""}`],
      ["Einlass", type?.admission ?? ""],
      ["Name", ticket.holder_name],
      ["Datum", `${EVENT.dateLabel}, ${EVENT.timeLabel}`],
      ["Ort", `${EVENT.venueName}`],
      ["", `${EVENT.venueStreet}, ${EVENT.venueCity}`],
      ["Bestellung", `${order.buyer_name} · ${euro(order.amount_cents)} gesamt`],
    ];
    for (const [label, value] of rows) {
      if (label) page.drawText(label, { x: m, y, size: 10, font: regular, color: GREY });
      page.drawText(value, { x: m + 90, y, size: 13, font: label === "Ticket" || label === "Name" ? bold : regular, color: BLACK });
      y -= 24;
    }

    const qr = await pdf.embedPng(await qrPng(ticket.code, 700));
    const qrSize = 230;
    const qrY = 128;
    page.drawImage(qr, { x: (width - qrSize) / 2, y: qrY, width: qrSize, height: qrSize });
    const codeWidth = bold.widthOfTextAtSize(ticket.code, 16);
    page.drawText(ticket.code, { x: (width - codeWidth) / 2, y: qrY - 26, size: 16, font: bold, color: BLACK });

    if (ticket.status !== "valid" || order.status !== "paid") {
      page.drawText("UNGÜLTIG", { x: m, y: qrY + qrSize + 20, size: 28, font: bold, color: rgb(0.8, 0, 0) });
    }

    page.drawLine({ start: { x: m, y: 92 }, end: { x: width - m, y: 92 }, thickness: 1, color: LINE });
    const foot = [
      "Bitte den QR-Code am Einlass bereithalten. Jeder Code gilt für genau einen Einlass.",
      "Unter 18 Jahren ohne erziehungsbeauftragte Person nur bis 24 Uhr. Ausweis mitbringen.",
      `Veranstalter: ${EVENT.organizer} (keine Schulveranstaltung).`,
    ];
    foot.forEach((t, i) => page.drawText(t, { x: m, y: 74 - i * 14, size: 9, font: regular, color: GREY }));
  }

  return Buffer.from(await pdf.save());
}
