// Angaben zum Veranstalter für Impressum, Datenschutz und AGB.
// Alles, was mit "[" beginnt, ist ein Platzhalter und wird auf der Seite gelb markiert.
// Bitte hier einmal ausfüllen – die drei Rechtstexte übernehmen die Werte automatisch.

export const LEGAL = {
  // Rechtsform: Ein Abiturjahrgang, der gemeinsam einen Ball veranstaltet, ist rechtlich meist eine
  // Gesellschaft bürgerlichen Rechts (GbR). Falls ein Förderverein o. ä. Veranstalter ist, hier ändern.
  organizerName: "Abiturjahrgang 2027 des Wittelsbacher-Gymnasiums München",
  legalForm: "Gesellschaft bürgerlichen Rechts (GbR)",
  // Mindestens eine volljährige, vertretungsberechtigte Person
  representatives: "Jakob Liess",
  // Ladungsfähige Anschrift (kein Postfach, nicht die Schuladresse)
  street: "Gabelsbergerstraße 6",
  city: "80333 München",
  email: "jakob.liess@outlook.de",
  phone: "+49 157 37260486",
  // Verantwortlich für redaktionelle Inhalte (§ 18 Abs. 2 MStV)
  contentResponsible: "Jakob Liess, Gabelsbergerstraße 6, 80333 München",
  // Umsatzsteuer: Kleinunternehmerregelung (§ 19 UStG) üblich – mit Steuerberatung/Finanzamt klären
  vatNote: "Gemäß § 19 UStG wird keine Umsatzsteuer berechnet. [Mit Finanzamt/Steuerberatung prüfen]",
  // Löschfrist für Bestelldaten nach der Veranstaltung
  deletionPeriod: "drei Monate",
  updated: "November 2026",
} as const;

export const isPlaceholder = (v: string) => v.includes("[");
