import { getTicketByCode, ticketTypeMap } from "@/lib/orders";
import { buildPkpass, isAppleWalletConfigured } from "@/lib/pkpass";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: Request, props: { params: Promise<{ code: string }> }) {
  const params = await props.params;
  if (!isAppleWalletConfigured()) return new Response("Apple Wallet ist nicht eingerichtet", { status: 501 });
  const found = await getTicketByCode(decodeURIComponent(params.code));
  if (!found || found.order.status !== "paid" || found.ticket.status !== "valid") {
    return new Response("Nicht gefunden", { status: 404 });
  }
  const types = await ticketTypeMap();
  const pass = await buildPkpass(found.order, found.ticket, types[found.ticket.ticket_type_id]);
  return new Response(new Uint8Array(pass), {
    headers: {
      "Content-Type": "application/vnd.apple.pkpass",
      "Content-Disposition": `attachment; filename="Abiball-2027-${found.ticket.code}.pkpass"`,
      "Cache-Control": "private, no-store",
    },
  });
}
