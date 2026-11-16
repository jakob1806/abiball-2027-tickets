import { NextResponse } from "next/server";
import { db } from "@/lib/supabase";
import { requireAdminApi } from "@/lib/admin-auth";
import { decryptPassword } from "@/lib/scanner-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Passwort im Admin anzeigen (entschlüsselt). */
export async function GET(_req: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const denied = await requireAdminApi();
  if (denied) return denied;
  const { data } = await db().from("scanner_users").select("password_enc").eq("id", params.id).maybeSingle();
  if (!data) return NextResponse.json({ error: "Konto nicht gefunden" }, { status: 404 });
  try {
    return NextResponse.json({ password: decryptPassword(data.password_enc) }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Passwort kann nicht entschlüsselt werden – bitte zurücksetzen." }, { status: 500 });
  }
}
