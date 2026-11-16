import { NextResponse } from "next/server";
import { requireScanner } from "@/lib/scanner-api";
import { checkinStats } from "@/lib/checkin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { denied } = await requireScanner(req);
  if (denied) return denied;
  return NextResponse.json(await checkinStats());
}
