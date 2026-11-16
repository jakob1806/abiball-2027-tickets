import { NextResponse } from "next/server";
import { requireScanner } from "@/lib/scanner-api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { scanner, denied } = await requireScanner(req);
  if (denied) return denied;
  return NextResponse.json({ name: scanner!.label, isAdmin: scanner!.id === null });
}
