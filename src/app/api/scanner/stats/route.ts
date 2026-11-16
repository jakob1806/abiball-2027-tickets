import { NextResponse } from "next/server";
import { requireScanner } from "@/lib/scanner-api";
import { checkinStats } from "@/lib/checkin";
import { getWristbands } from "@/lib/wristbands";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { denied } = await requireScanner(req);
  if (denied) return denied;
  const [stats, wristbands] = await Promise.all([checkinStats(), getWristbands()]);
  return NextResponse.json({ ...stats, wristbands });
}
