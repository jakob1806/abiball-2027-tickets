# Abiball Einlass – iOS-App

Nativer Einlass-Scanner (SwiftUI, iOS 17+) für das Abiball-2027-Ticketportal.
Bundle-ID `de.abiballwbg.scanner`, Team `DVH3MYQ64A`, automatische Signierung.

- Server-Adresse: `AbiballEinlass/Config.swift` → `Config.baseURL` (für eigene Domain nur dort ändern)
- Projekt wird aus `project.yml` erzeugt: `xcodegen generate` (nach neuen Dateien)
- Simulator-Test ohne Konto: Debug-Build mit Startargument `-demo` (Beispieldaten; im Release nicht enthalten)

## Bauen

```bash
xcodebuild -project AbiballEinlass.xcodeproj -scheme AbiballEinlass -destination 'platform=iOS Simulator,name=iPhone 17' build
```

## Neue Version zu TestFlight

1. In App Store Connect (einmalig) App anlegen: „Meine Apps“ → „+“ → „Neue App“, Plattform iOS,
   Name z. B. „Abiball Einlass WBG“, Sprache Deutsch, Bundle-ID `de.abiballwbg.scanner`, SKU `abiball-einlass`.
2. Archiv erstellen:
   ```bash
   xcodebuild -project AbiballEinlass.xcodeproj -scheme AbiballEinlass -configuration Release -destination 'generic/platform=iOS' -archivePath build/AbiballEinlass.xcarchive -allowProvisioningUpdates archive
   ```
3. Hochladen (Buildnummer wird automatisch erhöht):
   ```bash
   xcodebuild -exportArchive -archivePath build/AbiballEinlass.xcarchive -exportOptionsPlist ExportOptions.plist -exportPath build/export -allowProvisioningUpdates
   ```
   Alternativ: Xcode → Window → Organizer → Archiv → „Distribute App“ → „TestFlight Internal Only“.
4. App Store Connect → App → TestFlight: nach der Verarbeitung (5–30 Min.) Gruppe „Einlass-Team“ anlegen,
   Tester per Apple-ID-E-Mail einladen. Sie installieren die App „TestFlight“ und nehmen die Einladung an.
   Interne Tester (Mitglieder des Developer-Teams) brauchen keine Beta-Prüfung; externe Tester eine kurze Prüfung durch Apple.

Verschlüsselungsfrage ist durch `ITSAppUsesNonExemptEncryption = NO` bereits beantwortet.

## Möglichst wenige Apple-Prüfungen

- Version bleibt **1.0** (`MARKETING_VERSION` in `project.yml`). Nur die Buildnummer steigt automatisch.
  Eine neue Versionsnummer (1.1, 2.0 …) löst wieder eine volle Beta-Prüfung aus.
- Xcode-Cloud-Workflow startet nur bei Änderungen in `scanner-app/` – Website-Änderungen erzeugen keine App-Builds.
- Builds laufen nach 90 Tagen ab: einige Wochen vor dem Ball einen frischen Build starten.
