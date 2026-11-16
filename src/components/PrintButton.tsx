"use client";

export default function PrintButton({ label = "Drucken" }: { label?: string }) {
  return <button className="btn small ghost no-print" onClick={() => window.print()}>{label}</button>;
}
