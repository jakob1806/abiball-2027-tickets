import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/supabase";
import { requireAdminApi } from "@/lib/admin-auth";
import { AGE_GROUP_IDS } from "@/lib/event";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const band = z.object({ name: z.string().trim().min(1).max(30), color: z.string().regex(/^#[0-9a-fA-F]{6}$/) });
const schema = z.object(Object.fromEntries(AGE_GROUP_IDS.map((id) => [id, band])) as Record<(typeof AGE_GROUP_IDS)[number], typeof band>);

export async function PUT(req: Request) {
  const denied = await requireAdminApi();
  if (denied) return denied;
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Bitte für jede Altersgruppe Name und Farbe angeben." }, { status: 400 });
  const value = Object.fromEntries(Object.entries(parsed.data).map(([k, v]) => [k, { name: v.name, color: v.color.toLowerCase() }]));
  const { error } = await db().from("settings").update({ wristbands: value }).eq("id", true);
  if (error) {
    const missing = /wristbands/.test(error.message);
    return NextResponse.json(
      { error: missing ? "Datenbank-Migration 20261116080000_baendchenfarben.sql fehlt noch." : error.message },
      { status: 500 },
    );
  }
  return NextResponse.json({ ok: true, message: "Bändchenfarben gespeichert. Scanner und App zeigen sie sofort an." });
}
