import { NextResponse } from "next/server";
import { SCANNER_COOKIE, loginScanner } from "@/lib/scanner-auth";
import { allowed, clientIp, hit, tooManyRequests } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const { username, password } = (await req.json().catch(() => ({}))) as { username?: string; password?: string };
  const ip = clientIp(req);
  await new Promise((r) => setTimeout(r, 300));
  if (typeof username !== "string" || typeof password !== "string") {
    return NextResponse.json({ error: "Benutzername und Passwort angeben" }, { status: 400 });
  }
  // Gezählt werden nur Fehlversuche, damit erfolgreiche Logins am Abend nie blockiert werden
  if (!(await allowed("scannerLogin", ip))) {
    return tooManyRequests("scannerLogin", "Zu viele Fehlversuche von diesem Netz. Bitte warte 15 Minuten oder melde dich beim Orga-Team.");
  }
  const result = await loginScanner(username, password);
  if (!result) {
    await hit("scannerLogin", ip);
    return NextResponse.json({ error: "Benutzername oder Passwort falsch" }, { status: 401 });
  }
  const res = NextResponse.json({ token: result.token, user: { name: result.user.name, username: result.user.username } });
  res.cookies.set(SCANNER_COOKIE, result.token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 30 * 86400,
  });
  return res;
}
