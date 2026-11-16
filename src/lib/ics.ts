import { EVENT, VENUE_ONE_LINE } from "./event";
import { siteUrl } from "./env";

function icsDate(iso: string): string {
  return new Date(iso).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

function esc(text: string): string {
  return text.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/,/g, "\\,").replace(/;/g, "\;");
}

function fold(line: string): string {
  const out: string[] = [];
  let rest = line;
  while (Buffer.byteLength(rest, "utf8") > 74) {
    let cut = 74;
    while (Buffer.byteLength(rest.slice(0, cut), "utf8") > 74) cut--;
    out.push(rest.slice(0, cut));
    rest = " " + rest.slice(cut);
  }
  out.push(rest);
  return out.join("\r\n");
}

export function buildIcs(opts: { uid: string; afterpartyOnly?: boolean; orderUrl?: string }): string {
  const start = opts.afterpartyOnly ? EVENT.afterpartyStartISO : EVENT.startISO;
  const description = [
    `${EVENT.title}, veranstaltet vom ${EVENT.organizer}.`,
    opts.afterpartyOnly ? "Afterparty-Ticket: Einlass ab 22:30 Uhr." : "Ball-Ticket: Einlass ab 19:00 Uhr.",
    opts.orderUrl ? `Deine Tickets: ${opts.orderUrl}` : `Tickets: ${siteUrl()}`,
  ].join("\n");

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Abiturjahrgang 2027 Wittelsbacher-Gymnasium//Abiball 2027//DE",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${opts.uid}@abiball2027`,
    `DTSTAMP:${icsDate(new Date().toISOString())}`,
    `DTSTART:${icsDate(start)}`,
    `DTEND:${icsDate(EVENT.endISO)}`,
    `SUMMARY:${esc(EVENT.title)}`,
    `LOCATION:${esc(VENUE_ONE_LINE)}`,
    `DESCRIPTION:${esc(description)}`,
    "BEGIN:VALARM",
    "TRIGGER:-PT3H",
    "ACTION:DISPLAY",
    `DESCRIPTION:${esc(EVENT.title)} heute Abend`,
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  return lines.map(fold).join("\r\n") + "\r\n";
}
