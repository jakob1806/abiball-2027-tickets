import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin-auth";
import { checkinStats, performCheckin } from "@/lib/checkin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Web-Scanner im Admin (angemeldet mit Admin-Passwort). */
export async function POST(req: Request) {
  const denied = await requireAdminApi();
  if (denied) return denied;
  const { code } = (await req.json().catch(() => ({}))) as { code?: string };
  if (!code || typeof code !== "string" || code.length > 200) return NextResponse.json({ error: "Kein Code" }, { status: 400 });
  return NextResponse.json(await performCheckin(code, { id: null, label: "Admin" }));
}

/** Live-Zähler. */
export async function GET() {
  const denied = await requireAdminApi();
  if (denied) return denied;
  const s = await checkinStats();
  return NextResponse.json({ ...s, total: s.sold });
}
