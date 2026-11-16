import "server-only";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { ADMIN_COOKIE, verifySessionToken } from "./session";

export async function isAdmin(): Promise<boolean> {
  return verifySessionToken((await cookies()).get(ADMIN_COOKIE)?.value);
}

/** Für API-Routen: gibt eine 401-Antwort zurück, wenn nicht eingeloggt. */
export async function requireAdminApi(): Promise<NextResponse | null> {
  if (await isAdmin()) return null;
  return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
}
