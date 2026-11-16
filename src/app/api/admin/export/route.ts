import ExcelJS from "exceljs";
import { db } from "@/lib/supabase";
import { requireAdminApi } from "@/lib/admin-auth";
import { ticketTypeMap } from "@/lib/orders";
import { PAYMENT_LABEL, STATUS_LABEL, relationLabel } from "@/lib/format";
import type { OrderWithDetails } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const fmt = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString("de-DE", { timeZone: "Europe/Berlin" }) : "";

export async function GET() {
  const denied = await requireAdminApi();
  if (denied) return denied;

  const { data, error } = await db()
    .from("orders")
    .select("*, order_items(*), tickets(*)")
    .order("created_at", { ascending: true });
  if (error) return new Response(error.message, { status: 500 });
  const orders = data as OrderWithDetails[];
  const types = await ticketTypeMap();

  const wb = new ExcelJS.Workbook();
  wb.creator = "Abiball 2027";
  wb.created = new Date();

  const ob = wb.addWorksheet("Buchungen");
  ob.columns = [
    { header: "Bestell-ID", key: "id", width: 38 },
    { header: "Angelegt", key: "created", width: 18 },
    { header: "Status", key: "status", width: 12 },
    { header: "Zahlung", key: "pay", width: 16 },
    { header: "Name", key: "name", width: 26 },
    { header: "E-Mail", key: "email", width: 30 },
    { header: "Bezug", key: "rel", width: 26 },
    { header: "Weitere Gäste", key: "guests", width: 40 },
    ...Object.values(types).map((t) => ({ header: t.name, key: `t_${t.id}`, width: 14 })),
    { header: "Betrag (€)", key: "amount", width: 12 },
    { header: "Bezahlt am", key: "paid", width: 18 },
    { header: "Mail versendet", key: "mail", width: 18 },
    { header: "Stripe Payment Intent", key: "pi", width: 30 },
    { header: "Notiz", key: "notes", width: 30 },
  ];
  for (const o of orders) {
    ob.addRow({
      id: o.id,
      created: fmt(o.created_at),
      status: STATUS_LABEL[o.status],
      pay: PAYMENT_LABEL[o.payment_method],
      name: o.buyer_name,
      email: o.email,
      rel: relationLabel(o.relation, o.guest_of),
      guests: o.guest_names.join(", "),
      ...Object.fromEntries(Object.values(types).map((t) => [`t_${t.id}`, o.order_items.find((i) => i.ticket_type_id === t.id)?.quantity ?? 0])),
      amount: o.amount_cents / 100,
      paid: fmt(o.paid_at),
      mail: fmt(o.mail_sent_at),
      pi: o.stripe_payment_intent ?? "",
      notes: o.notes ?? "",
    });
  }

  const tb = wb.addWorksheet("Tickets");
  tb.columns = [
    { header: "Code", key: "code", width: 22 },
    { header: "Ticketart", key: "type", width: 18 },
    { header: "Name", key: "holder", width: 26 },
    { header: "Ticketstatus", key: "status", width: 12 },
    { header: "Bestellstatus", key: "ostatus", width: 12 },
    { header: "Eingecheckt", key: "checkin", width: 18 },
    { header: "Besteller/in", key: "buyer", width: 26 },
    { header: "E-Mail", key: "email", width: 30 },
    { header: "Bezug", key: "rel", width: 26 },
    { header: "Bestell-ID", key: "order", width: 38 },
  ];
  for (const o of orders) {
    for (const t of o.tickets) {
      tb.addRow({
        code: t.code,
        type: types[t.ticket_type_id]?.name ?? t.ticket_type_id,
        holder: t.holder_name,
        status: t.status === "valid" ? "Gültig" : "Storniert",
        ostatus: STATUS_LABEL[o.status],
        checkin: fmt(t.checked_in_at),
        buyer: o.buyer_name,
        email: o.email,
        rel: relationLabel(o.relation, o.guest_of),
        order: o.id,
      });
    }
  }

  for (const ws of [ob, tb]) {
    ws.getRow(1).font = { bold: true };
    ws.views = [{ state: "frozen", ySplit: 1 }];
    ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: ws.columnCount } };
  }
  ob.getColumn("amount").numFmt = "#,##0.00";

  const buf = await wb.xlsx.writeBuffer();
  const stamp = new Date().toISOString().slice(0, 16).replace(/[:T]/g, "-");
  return new Response(new Uint8Array(buf as ArrayBuffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="abiball-2027-buchungen-${stamp}.xlsx"`,
      "Cache-Control": "no-store",
    },
  });
}
