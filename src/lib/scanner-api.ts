import "server-only";
import { NextResponse } from "next/server";
import { currentScanner } from "./scanner-auth";

/** Für Scanner-API-Routen: liefert den Scannenden oder eine 401-Antwort. */
export async function requireScanner(req: Request) {
  const scanner = await currentScanner(req);
  if (!scanner) return { scanner: null, denied: NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 }) };
  return { scanner, denied: null };
}
