"use client";

import { AGE_GROUPS } from "@/lib/event";

/** Auswahl der Altersgruppe am Tag des Abiballs. Leerer Wert = noch nichts gewählt. */
export default function AgeSelect({
  value,
  onChange,
  label,
  required = true,
}: {
  value: string;
  onChange: (v: string) => void;
  label: string;
  required?: boolean;
}) {
  return (
    <label className="field">
      {label}
      <select required={required} value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="" disabled>Bitte wählen</option>
        {AGE_GROUPS.map((a) => (
          <option key={a.id} value={a.id}>{a.label}</option>
        ))}
      </select>
    </label>
  );
}

export const AGE_HINT =
  "Gemeint ist das Alter am Tag des Abiballs. Am Einlass wird es mit einem Ausweis geprüft und danach gibt es das passende Bändchen.";

export const MINOR_HINT =
  "Unter 18: Ohne erziehungsbeauftragte Person ist um 24 Uhr Schluss. Unter 16: Teilnahme nur mit personensorgeberechtigter oder erziehungsbeauftragter Person. Die Erziehungsbeauftragung bitte schriftlich mitbringen.";
