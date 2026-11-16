// Angaben zum Veranstalter für Impressum, Datenschutz und AGB.
// Alles, was mit "[" beginnt, ist ein Platzhalter und wird auf der Seite gelb markiert.
// Bitte hier einmal ausfüllen – die drei Rechtstexte übernehmen die Werte automatisch.

export const LEGAL = {
  // Rechtsform: Ein Abiturjahrgang, der gemeinsam einen Ball veranstaltet, ist rechtlich meist eine
  // Gesellschaft bürgerlichen Rechts (GbR). Falls ein Förderverein o. ä. Veranstalter ist, hier ändern.
  organizerName: "Abiturjahrgang 2027 des Wittelsbacher-Gymnasiums München",
  legalForm: "Gesellschaft bürgerlichen Rechts (GbR)",
  // Mindestens eine volljährige, vertretungsberechtigte Person
  representatives: "[Vor- und Nachname], [Vor- und Nachname]",
  // Ladungsfähige Anschrift (kein Postfach, nicht die Schuladresse)
  street: "[Straße Hausnummer]",
  city: "[PLZ] München",
  email: "[kontakt@beispiel.de]",
  phone: "[Telefonnummer]",
  // Verantwortlich für redaktionelle Inhalte (§ 18 Abs. 2 MStV)
  contentResponsible: "[Vor- und Nachname, Anschrift wie oben]",
  // Umsatzsteuer: Kleinunternehmerregelung (§ 19 UStG) üblich – mit Steuerberatung/Finanzamt klären
  vatNote: "Gemäß § 19 UStG wird keine Umsatzsteuer berechnet. [Mit Finanzamt/Steuerberatung prüfen]",
  // Löschfrist für Bestelldaten nach der Veranstaltung
  deletionPeriod: "drei Monate",
  updated: "November 2026",
} as const;

export const isPlaceholder = (v: string) => v.includes("[");
