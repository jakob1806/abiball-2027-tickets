"use client";
import { createContext, useContext } from "react";
import { AGE_GROUPS } from "@/lib/event";

export type ClientWristbands = Record<string, { name: string; color: string }>;

const defaults: ClientWristbands = Object.fromEntries(AGE_GROUPS.map((a) => [a.id, { name: a.wristband, color: a.color }]));
const Ctx = createContext<ClientWristbands>(defaults);

/** Stellt die im Admin gepflegten Bändchenfarben allen Bändchen-Anzeigen bereit. */
export function WristbandProvider({ value, children }: { value: ClientWristbands; children: React.ReactNode }) {
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useWristbands() {
  return useContext(Ctx);
}
