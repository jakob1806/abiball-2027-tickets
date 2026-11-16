import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin-auth";
import { sendTicketMail } from "@/lib/mail";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const denied = await requireAdminApi();
  if (denied) return denied;
  try {
    await sendTicketMail(params.id);
    return NextResponse.json({ message: "Mail wurde erneut versendet." });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Versand fehlgeschlagen" }, { status: 500 });
  }
}
