/** Zeigt Text an; Platzhalter in [eckigen Klammern] werden gelb markiert. */
export default function Ph({ children }: { children: string }) {
  const parts = children.split(/(\[[^\]]+\])/g);
  return (
    <>
      {parts.map((p, i) => (p.startsWith("[") ? <mark key={i} className="ph">{p}</mark> : <span key={i}>{p}</span>))}
    </>
  );
}
