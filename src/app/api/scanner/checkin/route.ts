import { NextResponse } from "next/server";
import { db } from "@/lib/supabase";
import { requireScanner } from "@/lib/scanner-api";
import { performCheckin } from "@/lib/checkin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Einlass per gescanntem Code ({ code }) oder aus der Gästeliste ({ ticketId }). */
export async function POST(req: Request) {
  const { scanner, denied } = await requireScanner(req);
  if (denied) return denied;
  const body = (await req.json().catch(() => ({}))) as { code?: string; ticketId?: string };
  let code = typeof body.code === "string" ? body.code : null;
  if (!code && typeof body.ticketId === "string" && /^[0-9a-f-]{36}$/i.test(body.ticketId)) {
    const { data } = await db().from("tickets").select("code").eq("id", body.ticketId).maybeSingle();
    code = data?.code ?? null;
  }
  if (!code || code.length > 200) return NextResponse.json({ error: "Kein Code" }, { status: 400 });
  return NextResponse.json(await performCheckin(code, scanner!));
}
