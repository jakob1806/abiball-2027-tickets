import { getOrderByToken } from "@/lib/orders";
import { buildIcs } from "@/lib/ics";
import { siteUrl } from "@/lib/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: { token: string } }) {
  const order = await getOrderByToken(params.token);
  if (!order || order.status !== "paid") return new Response("Nicht gefunden", { status: 404 });
  const afterpartyOnly = order.tickets.every((t) => t.ticket_type_id === "afterparty");
  const ics = buildIcs({ uid: order.id, afterpartyOnly, orderUrl: `${siteUrl()}/bestellung/${order.public_token}` });
  return new Response(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'attachment; filename="Abiball-2027.ics"',
      "Cache-Control": "private, no-store",
    },
  });
}
