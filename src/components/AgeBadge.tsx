"use client";
import { ageGroup } from "@/lib/event";
import { useWristbands } from "./WristbandContext";

/** Altersgruppe mit Bändchenfarbe, z. B. „16–17 · Gelb“ (Farben aus den Admin-Einstellungen). */
export default function AgeBadge({ id, big = false }: { id: string | null | undefined; big?: boolean }) {
  const bands = useWristbands();
  const a = ageGroup(id);
  if (!a) return <span className="badge">Alter fehlt</span>;
  const w = bands[a.id] ?? { name: a.wristband, color: a.color };
  return (
    <span className={`age-badge${big ? " big" : ""}`} style={{ borderColor: w.color }}>
      <span className="age-dot" style={{ background: w.color }} aria-hidden />
      {a.short} · {w.name}
    </span>
  );
}
