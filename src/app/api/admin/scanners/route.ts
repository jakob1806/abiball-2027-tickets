import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/supabase";
import { requireAdminApi } from "@/lib/admin-auth";
import { encryptPassword, generatePassword, hashPassword } from "@/lib/scanner-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({
  name: z.string().trim().min(2, "Bitte einen Namen angeben").max(80),
  username: z.string().trim().toLowerCase().regex(/^[a-z0-9._-]{3,32}$/, "Benutzername: 3–32 Zeichen, nur a–z, 0–9, Punkt, Minus, Unterstrich"),
  password: z.string().min(8, "Passwort mindestens 8 Zeichen").max(100).optional(),
});

/** Neues Scanner-Konto anlegen. */
export async function POST(req: Request) {
  const denied = await requireAdminApi();
  if (denied) return denied;
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Ungültige Eingabe" }, { status: 400 });
  const password = parsed.data.password || generatePassword();
  const { data, error } = await db()
    .from("scanner_users")
    .insert({ name: parsed.data.name, username: parsed.data.username, password_hash: hashPassword(password), password_enc: encryptPassword(password) })
    .select("id")
    .single();
  if (error) {
    const msg = error.code === "23505" ? "Dieser Benutzername ist schon vergeben." : error.message;
    return NextResponse.json({ error: msg }, { status: 409 });
  }
  return NextResponse.json({ id: data.id, password, message: "Konto angelegt." });
}
