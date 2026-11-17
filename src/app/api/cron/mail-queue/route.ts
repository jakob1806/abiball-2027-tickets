import { NextResponse } from "next/server";
import { processMailQueue } from "@/lib/mail";
import { processTransfers } from "@/lib/transfer";
import { db } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Täglicher Cron (vercel.json): Überweisungen erinnern/stornieren, Mails aus der Warteschlange senden. Geschützt über CRON_SECRET. */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Nicht erlaubt" }, { status: 401 });
  }
  const transfers = await processTransfers();
  const mail = await processMailQueue(90);
  // Zähler der Begrenzungen nach einem Tag löschen (Datenschutzerklärung: spätestens nach zwei Tagen)
  const { error: rlError } = await db()
    .from("rate_limits")
    .delete()
    .lt("window_start", new Date(Date.now() - 86400000).toISOString());
  if (rlError) console.error("Begrenzungen aufräumen fehlgeschlagen", rlError);
  return NextResponse.json({ transfers, mail });
}
