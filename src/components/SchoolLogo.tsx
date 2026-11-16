import { Cormorant_Garamond } from "next/font/google";

const serif = Cormorant_Garamond({ subsets: ["latin"], weight: ["500", "600"], display: "swap" });

/**
 * Logo-Nachbau: Großes Bayerisches Staatswappen (Vektor, gemeinfrei) + neu gesetzter Schriftzug.
 * Bleibt bei jeder Größe scharf.
 */
export default function SchoolLogo({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  return (
    <div className={`school-logo school-logo-${size} ${serif.className}`} role="img" aria-label="Wittelsbacher-Gymnasium München">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/images/wappen-bayern.svg" alt="" width={712} height={431} className="school-logo-crest" />
      <span className="school-logo-name">Wittelsbacher-Gymnasium</span>
      <span className="school-logo-city">München</span>
    </div>
  );
}
