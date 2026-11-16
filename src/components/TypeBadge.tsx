/** Deutliche Unterscheidung der Ticketarten: Ball = schwarz gefüllt, Afterparty = Kontur. */
export default function TypeBadge({ typeId, name, number }: { typeId: string; name?: string; number?: string | null }) {
  const isBall = typeId === "ball";
  return (
    <span className={`type-badge ${isBall ? "type-ball" : "type-after"}`}>
      {number && <span className="type-num">{number}</span>}
      {name ?? (isBall ? "Ball" : "Afterparty")}
    </span>
  );
}
