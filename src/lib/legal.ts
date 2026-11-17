// Angaben zum Veranstalter für Impressum, Datenschutz und AGB.
// Alles, was mit "[" beginnt, ist ein Platzhalter und wird auf der Seite gelb markiert.
// Bitte hier einmal ausfüllen – die drei Rechtstexte übernehmen die Werte automatisch.

export const LEGAL = {
  // Rechtsform: Ein Abiturjahrgang, der gemeinsam einen Ball veranstaltet, ist rechtlich meist eine
  // Gesellschaft bürgerlichen Rechts (GbR). Falls ein Förderverein o. ä. Veranstalter ist, hier ändern.
  organizerName: "Abiturjahrgang 2027 des Wittelsbacher-Gymnasiums München",
  legalForm: "Gesellschaft bürgerlichen Rechts (GbR)",
  // Mindestens eine volljährige, vertretungsberechtigte Person. Bei einer (nicht eingetragenen) GbR
  // möglichst alle vertretungsberechtigten Gesellschafter/innen nennen – im Mietvertrag mit der AAHHH GmbH
  // stehen „weitere Unterzeichnende“, die vor Unterzeichnung ergänzt werden.
  representatives: "Jakob Liess [ggf. weitere vertretungsberechtigte Mitglieder des Abiturjahrgangs ergänzen, z. B. die weiteren Unterzeichnenden des Mietvertrags]",
  // Ladungsfähige Anschrift (kein Postfach, nicht die Schuladresse)
  street: "Gabelsbergerstraße 6",
  city: "80333 München",
  email: "jakob.liess@outlook.de",
  phone: "+49 157 37260486",
  // Verantwortlich für redaktionelle Inhalte (§ 18 Abs. 2 MStV)
  contentResponsible: "Jakob Liess, Gabelsbergerstraße 6, 80333 München",
  // Umsatzsteuer: Kleinunternehmerregelung (§ 19 UStG) üblich – mit Steuerberatung/Finanzamt klären.
  // Achtung seit 2025: Im ersten Jahr gilt die Grenze von 25.000 € schon für das laufende Jahr. 350 Ball-Tickets
  // zu 65 € ergeben bereits rund 22.750 €, mit Afterparty und Abendkasse kann die Grenze überschritten werden.
  vatNote: "Gemäß § 19 UStG wird keine Umsatzsteuer berechnet. [Mit Finanzamt/Steuerberatung prüfen – Umsatzgrenze 25.000 € beachten]",
  // Löschfrist für Bestelldaten nach der Veranstaltung
  deletionPeriod: "drei Monate",
  // Postfach hinter der Kontakt-E-Mail (für die Datenschutzerklärung, Abschnitt „Kontakt“)
  emailProvider: "Microsoft Ireland Operations Limited, One Microsoft Place, South County Business Park, Leopardstown, Dublin 18, Irland (Outlook.com)",
  // Bank für Überweisungen (Datenschutz, Abschnitt Zahlung per Überweisung)
  bankName: "[Name der Bank des Abiturjahrgangs]",
  updated: "November 2026",
} as const;

export const isPlaceholder = (v: string) => v.includes("[");
