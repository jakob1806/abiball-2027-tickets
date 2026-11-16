// Zentrale Eckdaten der Veranstaltung.
// Sprachregel: Den Veranstaltungsort nie als „Location“ bezeichnen.

export const EVENT = {
  title: "Abiball 2027",
  school: "Wittelsbacher-Gymnasium München",
  organizer: "Abiturjahrgang 2027 des Wittelsbacher-Gymnasiums München",
  organizerNote: "Der Abiball ist eine private Veranstaltung des Abiturjahrgangs 2027 und keine Schulveranstaltung.",
  dateLabel: "Freitag, 25. Juni 2027",
  timeLabel: "19:00 bis 04:00 Uhr",
  // Europe/Berlin, Sommerzeit (UTC+2)
  startISO: "2027-06-25T19:00:00+02:00",
  endISO: "2027-06-26T04:00:00+02:00",
  afterpartyStartISO: "2027-06-25T22:30:00+02:00",
  venueName: "Penthouse im Werk12",
  venueStreet: "Speicherstraße 20, 4. Stock",
  venueCity: "81671 München",
  venueLat: 48.1236,
  venueLng: 11.6045,
  maxPerOrder: 8,
  // Laut Miet- und Veranstaltungsvertrag mit der AAHHH GmbH: ca. 350 Gäste, bis zu 500 möglich.
  // Die tatsächliche Kapazität steht in der Datenbank (settings.total_capacity).
  totalCapacity: 350,
  // Laut Vertrag (§ 7): Abgerechnet werden mindestens 250 Personen.
  contractMinGuests: 250,
  reservationMinutes: 30,
  // Ticketart, die an der Abendkasse verkauft werden darf
  doorTicketTypeId: "afterparty",
} as const;

// Pflichtangabe laut Vertrag (§ 5 Nr. 6): Bei Angabe des Veranstaltungsortes „aahhh“ und „aahhh.de“ nennen.
export const VENUE_BRAND = { label: "aahhh", url: "https://aahhh.de", domain: "aahhh.de" } as const;

// Altersgruppen am Tag des Abiballs. Die Bändchenfarben hier zentral ändern
// (und in der iOS-App in scanner-app/AbiballEinlass/Style.swift, `AgeGroup`).
export const AGE_GROUPS = [
  { id: "u16", label: "unter 16", short: "< 16", wristband: "Rot", color: "#c40000" },
  { id: "u18", label: "16 oder 17", short: "16–17", wristband: "Gelb", color: "#d9a400" },
  { id: "a18", label: "18 oder älter", short: "18+", wristband: "Grün", color: "#0a7d32" },
] as const;

export type AgeGroupId = (typeof AGE_GROUPS)[number]["id"];
export const AGE_GROUP_IDS = AGE_GROUPS.map((a) => a.id) as [AgeGroupId, ...AgeGroupId[]];

export function ageGroup(id: string | null | undefined) {
  return AGE_GROUPS.find((a) => a.id === id) ?? null;
}

export const VENUE_ONE_LINE = `${EVENT.venueName}, ${EVENT.venueStreet}, ${EVENT.venueCity}`;

export const YOUTH_PROTECTION_TEXT =
  "Mir ist bekannt: Personen unter 16 Jahren dürfen nur in Begleitung einer personensorgeberechtigten oder erziehungsbeauftragten Person teilnehmen, Jugendliche unter 18 Jahren ohne erziehungsbeauftragte Person nur bis 24 Uhr bleiben (Jugendschutzgesetz). Am Einlass kann ein Ausweis verlangt werden. Ich informiere meine Gäste darüber.";
