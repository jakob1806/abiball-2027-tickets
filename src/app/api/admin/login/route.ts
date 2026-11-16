import { NextResponse } from "next/server";
import { ADMIN_COOKIE, SESSION_HOURS, checkPassword, createSessionToken } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const { password } = (await req.json().catch(() => ({}))) as { password?: string };
  // Kleine Verzögerung gegen Durchprobieren
  await new Promise((r) => setTimeout(r, 400));
  if (typeof password !== "string" || !(await checkPassword(password))) {
    return NextResponse.json({ error: "Falsches Passwort" }, { status: 401 });
  }
  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_COOKIE, await createSessionToken(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: SESSION_HOURS * 3600,
  });
  return res;
}
