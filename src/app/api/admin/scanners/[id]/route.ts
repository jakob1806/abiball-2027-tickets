import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/supabase";
import { requireAdminApi } from "@/lib/admin-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({ active: z.boolean().optional(), name: z.string().trim().min(2).max(80).optional() });

/** Konto sperren/entsperren oder umbenennen. Sperren meldet alle Geräte sofort ab. */
export async function PATCH(req: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const denied = await requireAdminApi();
  if (denied) return denied;
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Ungültige Eingabe" }, { status: 400 });
  const { data: u } = await db().from("scanner_users").select("token_version").eq("id", params.id).maybeSingle();
  if (!u) return NextResponse.json({ error: "Konto nicht gefunden" }, { status: 404 });
  const update: Record<string, unknown> = { ...parsed.data };
  if (parsed.data.active === false) update.token_version = u.token_version + 1;
  const { error } = await db().from("scanner_users").update(update).eq("id", params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ message: "Gespeichert." });
}

/** Konto löschen. Bisherige Scans bleiben mit dem Namen protokolliert. */
export async function DELETE(_req: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const denied = await requireAdminApi();
  if (denied) return denied;
  const { error } = await db().from("scanner_users").delete().eq("id", params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ message: "Konto gelöscht." });
}
