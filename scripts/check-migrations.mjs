#!/usr/bin/env node
// Prüft die Regeln für Datenbank-Migrationen (supabase/migrations).
//
//   node scripts/check-migrations.mjs [BASIS-REF]
//
// 1. Dateiname: 14-stellige Nummer + Name, z. B. 20261117090000_neue_spalte.sql
// 2. Jede Nummer kommt nur einmal vor
// 3. Bereits vorhandene Migrationen (im Stand BASIS-REF) werden nicht geändert, umbenannt oder gelöscht –
//    in Produktion sind sie schon ausgeführt, eine Änderung würde dort nie ankommen.
// 4. Neue Migrationen bekommen eine höhere Nummer als alle bisherigen, sonst werden sie beim Deploy übersprungen.
//
// Ohne BASIS-REF werden nur Regel 1 und 2 geprüft.

import { execFileSync } from "node:child_process";
import { readdirSync } from "node:fs";

const DIR = "supabase/migrations";
const NAME = /^(\d{14})_[a-z0-9_]+\.sql$/;
const base = process.argv[2];
const errors = [];

const files = readdirSync(DIR).filter((f) => !f.startsWith(".")).sort();

const seen = new Map();
for (const f of files) {
  const m = f.match(NAME);
  if (!m) {
    errors.push(`${f}: Name muss so aussehen: JJJJMMTTHHMMSS_beschreibung.sql (nur Kleinbuchstaben, Ziffern, _)`);
    continue;
  }
  if (seen.has(m[1])) errors.push(`${f}: Nummer ${m[1]} ist schon vergeben (${seen.get(m[1])})`);
  seen.set(m[1], f);
}

const git = (...args) => execFileSync("git", args, { encoding: "utf8" }).trim();

if (base) {
  let baseFiles = [];
  try {
    baseFiles = git("ls-tree", "--name-only", `${base}:${DIR}`).split("\n").filter(Boolean);
  } catch {
    console.log(`Hinweis: ${base} hat noch keinen Ordner ${DIR}, Vergleich übersprungen.`);
  }

  for (const f of baseFiles) {
    if (!files.includes(f)) {
      errors.push(`${f}: wurde gelöscht oder umbenannt. Bereits ausgeführte Migrationen bitte nie entfernen.`);
      continue;
    }
    const changed = git("diff", "--name-only", base, "--", `${DIR}/${f}`);
    if (changed) {
      errors.push(`${f}: wurde verändert. In Produktion läuft sie nicht noch einmal – bitte stattdessen eine neue Migration anlegen.`);
    }
  }

  const latestBase = baseFiles.map((f) => f.match(NAME)?.[1]).filter(Boolean).sort().at(-1);
  for (const f of files.filter((x) => !baseFiles.includes(x))) {
    const v = f.match(NAME)?.[1];
    if (v && latestBase && v <= latestBase) {
      errors.push(`${f}: Nummer muss größer sein als die letzte bestehende Migration (${latestBase}), z. B. das aktuelle Datum mit Uhrzeit.`);
    } else if (v) {
      console.log(`Neue Migration: ${f}`);
    }
  }
}

if (errors.length) {
  for (const e of errors) console.log(`::error file=${DIR}::${e}`);
  console.error(`\n${errors.length} Problem(e) mit den Migrationen.`);
  process.exit(1);
}
console.log(`Migrationen ok (${files.length} Dateien).`);
