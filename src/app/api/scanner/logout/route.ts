import { NextResponse } from "next/server";
import { SCANNER_COOKIE } from "@/lib/scanner-auth";

export async function POST() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SCANNER_COOKIE, "", { path: "/", maxAge: 0 });
  return res;
}
