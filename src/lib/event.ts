// Zentrale Eckdaten der Veranstaltung.
// Hinweis Mietvertrag: Den Veranstaltungsort nie als „Location“ bezeichnen.

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
  totalCapacity: 350,
  reservationMinutes: 30,
} as const;

export const VENUE_ONE_LINE = `${EVENT.venueName}, ${EVENT.venueStreet}, ${EVENT.venueCity}`;

export const YOUTH_PROTECTION_TEXT =
  "Mir ist bekannt, dass sich Personen unter 18 Jahren ohne erziehungsbeauftragte Person nur bis 24 Uhr auf der Veranstaltung aufhalten dürfen (Jugendschutzgesetz). Am Einlass kann ein Ausweis verlangt werden.";
