import ExcelJS from "exceljs";
import { db } from "@/lib/supabase";
import { requireAdminApi } from "@/lib/admin-auth";
import { ticketTypeMap } from "@/lib/orders";
import { PAYMENT_LABEL, STATUS_LABEL, relationLabel } from "@/lib/format";
import { EVENT } from "@/lib/event";
import type { OrderWithDetails, Ticket } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const fmt = (iso: string | null) => (iso ? new Date(iso).toLocaleString("de-DE", { timeZone: "Europe/Berlin" }) : "");
const BOLD = { bold: true } as const;
const HEAD_FILL: ExcelJS.Fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF000000" } };

function styleHeader(ws: ExcelJS.Worksheet, row = 1) {
  const r = ws.getRow(row);
  r.font = { bold: true, color: { argb: "FFFFFFFF" } };
  r.fill = HEAD_FILL;
  r.alignment = { vertical: "middle" };
  r.height = 20;
  ws.views = [{ state: "frozen", ySplit: row }];
  ws.autoFilter = { from: { row, column: 1 }, to: { row, column: ws.columnCount } };
}

function printSetup(ws: ExcelJS.Worksheet, title: string, landscape = false) {
  ws.pageSetup = {
    paperSize: 9, // A4
    orientation: landscape ? "landscape" : "portrait",
    fitToPage: true,
    fitToWidth: 1,
    fitToHeight: 0,
    printTitlesRow: "1:1",
    margins: { left: 0.4, right: 0.4, top: 0.6, bottom: 0.6, header: 0.3, footer: 0.3 },
  };
  ws.headerFooter = { oddHeader: `&L&B${title}&R${EVENT.title}`, oddFooter: "&LStand: &D &T&RSeite &P von &N" };
}

export async function GET() {
  const denied = await requireAdminApi();
  if (denied) return denied;

  const { data, error } = await db().from("orders").select("*, order_items(*), tickets(*)").order("created_at", { ascending: true });
  if (error) return new Response(error.message, { status: 500 });
  const orders = data as OrderWithDetails[];
  const types = await ticketTypeMap();
  const typeList = Object.values(types).sort((a, b) => a.sort - b.sort);

  type Row = { t: Ticket; o: OrderWithDetails };
  const allTickets: Row[] = orders.flatMap((o) => o.tickets.map((t) => ({ t, o })));
  const validTickets = allTickets.filter((r) => r.t.status === "valid" && r.o.status === "paid");
  const byNumber = (a: Row, b: Row) => (a.t.ticket_number ?? "").localeCompare(b.t.ticket_number ?? "", "de", { numeric: true });

  const wb = new ExcelJS.Workbook();
  wb.creator = "Abiball 2027";
  wb.created = new Date();

  // --- Übersicht ---------------------------------------------------------
  const ov = wb.addWorksheet("Übersicht", { properties: { tabColor: { argb: "FF000000" } } });
  ov.columns = [{ width: 30 }, { width: 14 }, { width: 14 }, { width: 14 }, { width: 16 }];
  ov.addRow([`${EVENT.title} · ${EVENT.school}`]).font = { bold: true, size: 16 };
  ov.addRow([`${EVENT.dateLabel}, ${EVENT.timeLabel} · ${EVENT.venueName}`]);
  ov.addRow([`Stand: ${fmt(new Date().toISOString())}`]).font = { italic: true, color: { argb: "FF6B6B6B" } };
  ov.addRow([]);
  const h = ov.addRow(["Ticketart", "Verkauft", "Eingecheckt", "Kontingent", "Umsatz (€)"]);
  h.font = { bold: true, color: { argb: "FFFFFFFF" } };
  h.fill = HEAD_FILL;
  let sumSold = 0, sumIn = 0, sumCents = 0;
  for (const tt of typeList) {
    const rows = validTickets.filter((r) => r.t.ticket_type_id === tt.id);
    const cents = orders
      .filter((o) => o.status === "paid")
      .reduce((s, o) => s + o.order_items.filter((i) => i.ticket_type_id === tt.id).reduce((a, i) => a + i.quantity * i.unit_price_cents, 0), 0);
    const checkedIn = rows.filter((r) => r.t.checked_in_at).length;
    sumSold += rows.length; sumIn += checkedIn; sumCents += cents;
    ov.addRow([`${tt.name} (${tt.number_prefix}-…)`, rows.length, checkedIn, tt.quota, cents / 100]);
  }
  const tot = ov.addRow(["Gesamt", sumSold, sumIn, "", sumCents / 100]);
  tot.font = BOLD;
  tot.border = { top: { style: "thin" } };
  ov.addRow([]);
  const ph = ov.addRow(["Zahlungsart", "Bestellungen", "Tickets", "", "Betrag (€)"]);
  ph.font = { bold: true, color: { argb: "FFFFFFFF" } };
  ph.fill = HEAD_FILL;
  for (const [m, label] of Object.entries(PAYMENT_LABEL)) {
    const os = orders.filter((o) => o.status === "paid" && o.payment_method === m);
    ov.addRow([label, os.length, os.reduce((s, o) => s + o.order_items.reduce((a, i) => a + i.quantity, 0), 0), "", os.reduce((s, o) => s + o.amount_cents, 0) / 100]);
  }
  const openTransfers = orders.filter((o) => o.status === "pending" && o.payment_method === "ueberweisung");
  if (openTransfers.length) {
    ov.addRow([]);
    ov.addRow([`Offene Überweisungen: ${openTransfers.length} · ${(openTransfers.reduce((s, o) => s + o.amount_cents, 0) / 100).toFixed(2)} €`]).font = BOLD;
  }
  ov.getColumn(5).numFmt = "#,##0.00";
  printSetup(ov, "Übersicht");

  // --- Ein Blatt pro Ticketart (Einlassliste zum Abhaken) -----------------
  for (const tt of typeList) {
    const ws = wb.addWorksheet(`${tt.name.replace(/-Ticket$/, "")} (${tt.number_prefix})`.slice(0, 31), {
      properties: { tabColor: { argb: tt.id === "ball" ? "FF000000" : "FF9E9E9E" } },
    });
    ws.columns = [
      { header: "✓", key: "check", width: 5 },
      { header: "Nr.", key: "nr", width: 9 },
      { header: "Name auf dem Ticket", key: "holder", width: 28 },
      { header: "Bestellt von", key: "buyer", width: 24 },
      { header: "Bezug", key: "rel", width: 26 },
      { header: "Eingecheckt", key: "in", width: 17 },
      { header: "Ticketcode", key: "code", width: 22 },
    ];
    for (const r of validTickets.filter((x) => x.t.ticket_type_id === tt.id).sort(byNumber)) {
      const row = ws.addRow({
        check: r.t.checked_in_at ? "✓" : "☐",
        nr: r.t.ticket_number ?? "",
        holder: r.t.holder_name,
        buyer: r.o.buyer_name,
        rel: relationLabel(r.o.relation, r.o.guest_of),
        in: fmt(r.t.checked_in_at),
        code: r.t.code,
      });
      row.getCell("check").alignment = { horizontal: "center" };
      row.getCell("nr").font = BOLD;
      row.border = { bottom: { style: "hair", color: { argb: "FFBDBDBD" } } };
    }
    styleHeader(ws);
    printSetup(ws, `Einlassliste ${tt.name}`);
  }

  // --- Gäste je Abiturient/in ---------------------------------------------
  const gs = wb.addWorksheet("Je Abiturient·in");
  gs.columns = [
    { header: "Abiturient/in", key: "abi", width: 28 },
    { header: "Ball", key: "ball", width: 8 },
    { header: "Afterparty", key: "after", width: 11 },
    { header: "Gesamt", key: "sum", width: 9 },
    { header: "Namen", key: "names", width: 70 },
  ];
  const groups = new Map<string, Row[]>();
  for (const r of validTickets) {
    const key = (r.o.relation === "abiturient" ? r.o.buyer_name : r.o.guest_of ?? "Ohne Angabe").trim();
    const existing = [...groups.keys()].find((k) => k.toLowerCase() === key.toLowerCase()) ?? key;
    groups.set(existing, [...(groups.get(existing) ?? []), r]);
  }
  for (const [abi, rows] of [...groups.entries()].sort((a, b) => a[0].localeCompare(b[0], "de"))) {
    gs.addRow({
      abi,
      ball: rows.filter((r) => r.t.ticket_type_id === "ball").length,
      after: rows.filter((r) => r.t.ticket_type_id !== "ball").length,
      sum: rows.length,
      names: rows.sort(byNumber).map((r) => `${r.t.ticket_number} ${r.t.holder_name}`).join(", "),
    });
  }
  styleHeader(gs);
  printSetup(gs, "Gäste je Abiturient/in", true);

  // --- Alle Tickets (inkl. storniert) -------------------------------------
  const tb = wb.addWorksheet("Alle Tickets");
  tb.columns = [
    { header: "Nr.", key: "nr", width: 9 },
    { header: "Ticketart", key: "type", width: 18 },
    { header: "Name", key: "holder", width: 26 },
    { header: "Ticketstatus", key: "status", width: 12 },
    { header: "Bestellstatus", key: "ostatus", width: 12 },
    { header: "Eingecheckt", key: "checkin", width: 18 },
    { header: "Besteller/in", key: "buyer", width: 24 },
    { header: "E-Mail", key: "email", width: 30 },
    { header: "Bezug", key: "rel", width: 26 },
    { header: "Code", key: "code", width: 22 },
    { header: "Bestell-ID", key: "order", width: 38 },
  ];
  for (const r of [...allTickets].sort(byNumber)) {
    tb.addRow({
      nr: r.t.ticket_number ?? "",
      type: types[r.t.ticket_type_id]?.name ?? r.t.ticket_type_id,
      holder: r.t.holder_name,
      status: r.t.status === "valid" ? "Gültig" : "Storniert",
      ostatus: STATUS_LABEL[r.o.status],
      checkin: fmt(r.t.checked_in_at),
      buyer: r.o.buyer_name,
      email: r.o.email,
      rel: relationLabel(r.o.relation, r.o.guest_of),
      code: r.t.code,
      order: r.o.id,
    });
  }
  styleHeader(tb);
  printSetup(tb, "Alle Tickets", true);

  // --- Buchungen ------------------------------------------------------------
  const ob = wb.addWorksheet("Buchungen");
  ob.columns = [
    { header: "Angelegt", key: "created", width: 18 },
    { header: "Status", key: "status", width: 12 },
    { header: "Zahlung", key: "pay", width: 16 },
    { header: "Name", key: "name", width: 24 },
    { header: "E-Mail", key: "email", width: 30 },
    { header: "Bezug", key: "rel", width: 26 },
    ...typeList.map((t) => ({ header: t.name, key: `t_${t.id}`, width: 12 })),
    { header: "Ticketnummern", key: "nums", width: 22 },
    { header: "Betrag (€)", key: "amount", width: 11 },
    { header: "Bezahlt am", key: "paid", width: 18 },
    { header: "Verwendungszweck", key: "ref", width: 16 },
    { header: "Zahlungsfrist", key: "due", width: 18 },
    { header: "Mail", key: "mail", width: 18 },
    { header: "Weitere Gäste", key: "guests", width: 40 },
    { header: "Notiz", key: "notes", width: 30 },
    { header: "Stripe Payment Intent", key: "pi", width: 30 },
    { header: "Bestell-ID", key: "id", width: 38 },
  ];
  for (const o of orders) {
    ob.addRow({
      created: fmt(o.created_at),
      status: STATUS_LABEL[o.status],
      pay: PAYMENT_LABEL[o.payment_method],
      name: o.buyer_name,
      email: o.email,
      rel: relationLabel(o.relation, o.guest_of),
      ...Object.fromEntries(typeList.map((t) => [`t_${t.id}`, o.order_items.find((i) => i.ticket_type_id === t.id)?.quantity ?? 0])),
      nums: o.tickets.map((t) => t.ticket_number).filter(Boolean).sort().join(", "),
      amount: o.amount_cents / 100,
      paid: fmt(o.paid_at),
      ref: o.transfer_reference ?? "",
      due: o.status === "pending" ? fmt(o.transfer_due_at) : "",
      mail: o.mail_sent_at ? fmt(o.mail_sent_at) : o.mail_queued_at ? "in Warteschlange" : "",
      guests: o.guest_names.join(", "),
      notes: o.notes ?? "",
      pi: o.stripe_payment_intent ?? "",
      id: o.id,
    });
  }
  ob.getColumn("amount").numFmt = "#,##0.00";
  styleHeader(ob);
  printSetup(ob, "Buchungen", true);

  const buf = await wb.xlsx.writeBuffer();
  const stamp = new Date().toISOString().slice(0, 16).replace(/[:T]/g, "-");
  return new Response(new Uint8Array(buf as ArrayBuffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="abiball-2027-liste-${stamp}.xlsx"`,
      "Cache-Control": "no-store",
    },
  });
}
