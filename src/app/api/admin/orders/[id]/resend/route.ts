import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin-auth";
import { MailSendError, sendTicketMail } from "@/lib/mail";
import { db } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(_req: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const denied = await requireAdminApi();
  if (denied) return denied;
  try {
    await sendTicketMail(params.id);
    return NextResponse.json({ message: "Mail wurde erneut versendet." });
  } catch (err) {
    if (err instanceof MailSendError && err.quotaReached) {
      await db().from("orders").update({ mail_sent_at: null, mail_queued_at: new Date().toISOString(), mail_last_error: err.message }).eq("id", params.id);
      return NextResponse.json({ message: "Tageslimit für Mails erreicht – die Mail liegt in der Warteschlange und geht automatisch raus." });
    }
    return NextResponse.json({ error: err instanceof Error ? err.message : "Versand fehlgeschlagen" }, { status: 500 });
  }
}
