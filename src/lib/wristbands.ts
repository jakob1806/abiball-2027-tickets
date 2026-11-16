import "server-only";
import { db } from "./supabase";
import { AGE_GROUPS, type AgeGroupId } from "./event";

export interface Wristband { name: string; color: string }
export type WristbandMap = Record<AgeGroupId, Wristband>;

/** Standardfarben aus event.ts (Fallback, falls in der Datenbank nichts gepflegt ist). */
export const DEFAULT_WRISTBANDS = Object.fromEntries(
  AGE_GROUPS.map((a) => [a.id, { name: a.wristband, color: a.color }]),
) as WristbandMap;

const HEX = /^#[0-9a-f]{6}$/i;

/** Bändchenfarben aus den Einstellungen; fehlende/ungültige Einträge fallen auf den Standard zurück. */
export async function getWristbands(): Promise<WristbandMap> {
  try {
    const { data, error } = await db().from("settings").select("wristbands").single();
    if (error || !data?.wristbands) return DEFAULT_WRISTBANDS;
    const stored = data.wristbands as Partial<Record<string, Partial<Wristband>>>;
    const out = { ...DEFAULT_WRISTBANDS };
    for (const a of AGE_GROUPS) {
      const w = stored[a.id];
      if (w && typeof w.name === "string" && w.name.trim() && typeof w.color === "string" && HEX.test(w.color)) {
        out[a.id] = { name: w.name.trim(), color: w.color.toLowerCase() };
      }
    }
    return out;
  } catch {
    return DEFAULT_WRISTBANDS;
  }
}

export function wristbandFor(map: WristbandMap, id: string | null | undefined): Wristband | null {
  return id && id in map ? map[id as AgeGroupId] : null;
}
