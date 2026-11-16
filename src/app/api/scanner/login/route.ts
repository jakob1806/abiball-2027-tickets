import { NextResponse } from "next/server";
import { SCANNER_COOKIE, loginScanner } from "@/lib/scanner-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const { username, password } = (await req.json().catch(() => ({}))) as { username?: string; password?: string };
  await new Promise((r) => setTimeout(r, 300));
  if (typeof username !== "string" || typeof password !== "string") {
    return NextResponse.json({ error: "Benutzername und Passwort angeben" }, { status: 400 });
  }
  const result = await loginScanner(username, password);
  if (!result) return NextResponse.json({ error: "Benutzername oder Passwort falsch" }, { status: 401 });
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
