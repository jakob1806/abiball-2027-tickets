import { NextResponse } from "next/server";
import { db } from "@/lib/supabase";
import { requireAdminApi } from "@/lib/admin-auth";
import { encryptPassword, generatePassword, hashPassword } from "@/lib/scanner-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Neues Passwort erzeugen. Alle Geräte dieses Kontos werden abgemeldet. */
export async function POST(_req: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const denied = await requireAdminApi();
  if (denied) return denied;
  const { data: u } = await db().from("scanner_users").select("token_version").eq("id", params.id).maybeSingle();
  if (!u) return NextResponse.json({ error: "Konto nicht gefunden" }, { status: 404 });
  const password = generatePassword();
  const { error } = await db()
    .from("scanner_users")
    .update({ password_hash: hashPassword(password), password_enc: encryptPassword(password), token_version: u.token_version + 1 })
    .eq("id", params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ password, message: "Neues Passwort erzeugt. Das Konto wurde auf allen Geräten abgemeldet." });
}
