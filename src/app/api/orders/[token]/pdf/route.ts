import { getOrderByToken, ticketTypeMap } from "@/lib/orders";
import { buildTicketsPdf } from "@/lib/pdf";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: { token: string } }) {
  const order = await getOrderByToken(params.token);
  if (!order || order.status !== "paid") return new Response("Nicht gefunden", { status: 404 });
  const tickets = order.tickets.filter((t) => t.status === "valid");
  const pdf = await buildTicketsPdf(order, tickets, await ticketTypeMap());
  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": 'attachment; filename="Abiball-2027-Tickets.pdf"',
      "Cache-Control": "private, no-store",
    },
  });
}
