import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin-auth";
import { processMailQueue } from "@/lib/mail";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Admin: Warteschlange jetzt abarbeiten. */
export async function POST() {
  const denied = await requireAdminApi();
  if (denied) return denied;
  const r = await processMailQueue(50);
  const message = r.stoppedByQuota
    ? `${r.sent} Mails verschickt. Das Tageslimit greift noch, ${r.remaining} warten weiter.`
    : `${r.sent} Mails verschickt. ${r.remaining} in der Warteschlange.`;
  return NextResponse.json({ ...r, message });
}
