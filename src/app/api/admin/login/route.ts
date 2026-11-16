import { NextResponse } from "next/server";
import { ADMIN_COOKIE, SESSION_HOURS, checkPassword, createSessionToken } from "@/lib/session";
import { allowed, clientIp, hit, tooManyRequests } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const { password } = (await req.json().catch(() => ({}))) as { password?: string };
  const ip = clientIp(req);
  // Gegen Durchprobieren: kleine Verzögerung + höchstens 10 Fehlversuche pro Gerät in 15 Minuten
  await new Promise((r) => setTimeout(r, 400));
  if (!(await allowed("adminLogin", ip))) {
    return tooManyRequests("adminLogin", "Zu viele Fehlversuche. Bitte warte 15 Minuten.");
  }
  if (typeof password !== "string" || !(await checkPassword(password))) {
    await hit("adminLogin", ip);
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
