import { NextResponse } from "next/server";
import { processMailQueue } from "@/lib/mail";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Täglicher Cron (vercel.json): verschickt Mails aus der Warteschlange. Geschützt über CRON_SECRET. */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Nicht erlaubt" }, { status: 401 });
  }
  const result = await processMailQueue(90);
  return NextResponse.json(result);
}
