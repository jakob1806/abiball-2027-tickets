import { ageGroup } from "@/lib/event";

/** Altersgruppe mit Bändchenfarbe, z. B. „16–17 · Gelb“. */
export default function AgeBadge({ id, big = false }: { id: string | null | undefined; big?: boolean }) {
  const a = ageGroup(id);
  if (!a) return <span className="badge">Alter fehlt</span>;
  return (
    <span className={`age-badge${big ? " big" : ""}`} style={{ borderColor: a.color }}>
      <span className="age-dot" style={{ background: a.color }} aria-hidden />
      {a.short} · {a.wristband}
    </span>
  );
}
