## Was ändert sich?

<!-- Kurz in eigenen Worten: Was kann die Seite/App danach, was ist anders? -->

## Datenbank

- [ ] Keine Datenbank-Änderung
- [ ] Neue Migration in `supabase/migrations/` (Nummer = aktuelles Datum mit Uhrzeit, höher als alle bisherigen)
  - [ ] Der **bisherige** Code läuft mit der neuen Datenbank weiter (die Migration wird beim Deploy *vor* dem neuen Code eingespielt)
  - [ ] Keine bestehende Migration verändert (stattdessen eine neue angelegt)

## Getestet

- [ ] Lokal ausprobiert bzw. in der Vercel-Vorschau angesehen
- [ ] Betrifft Kauf/Zahlung: einmal im Stripe-Testmodus durchgespielt
- [ ] Betrifft die iOS-App (`scanner-app/`): in Xcode gebaut und im Simulator getestet

Nach dem Merge veröffentlicht GitHub Actions automatisch: erst Datenbank, dann Website, danach Rauchtest.
Den Stand siehst du unter **Actions → Deploy**.
