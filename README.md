# Abiball 2027 – Ticketportal

Ticketverkauf für den Abiball 2027 des Abiturjahrgangs am Wittelsbacher-Gymnasium München.

**Freitag, 25.06.2027, 19:00 bis 04:00 Uhr · Penthouse im Werk12, Speicherstraße 20, 4. Stock, 81671 München**

Veranstalter ist der Abiturjahrgang 2027 – es handelt sich nicht um eine Schulveranstaltung.

> Sprachregel: Den Veranstaltungsort in Texten nie als „Location“ bezeichnen.

## Funktionen

- Öffentliche Seite mit Ticketauswahl (Ball-Ticket, Afterparty-Ticket), max. 8 Tickets pro Bestellung, Gesamtkapazität 350
- Bezahlung mit Stripe Checkout (Karte, Apple Pay, Google Pay), Plätze werden 30 Minuten reserviert
- Stripe-Webhook (idempotent) erzeugt Tickets mit eindeutigem QR-Code und verschickt eine Mail über Resend mit
  PDF-Tickets, einer `.pkpass`-Datei pro Ticket (Apple Wallet), einer `.ics`-Kalenderdatei und einem Google-Wallet-Link
- Bestellseite (`/bestellung/<token>`) und Ticketseite (`/ticket/<code>`) mit QR-Code und Wallet-Buttons
- Admin-Bereich (`/admin`): Kennzahlen, Buchungsliste mit Suche und Filter, stornieren, über Stripe erstatten,
  Mail erneut senden, manuelle Buchung (bar, Überweisung, frei), Excel-Export, Einlass-Scanner mit Handykamera
  und manueller Codeeingabe (erkennt doppelten Einlass)
- Altersabfrage beim Kauf: für jede Person die Altersgruppe am Tag des Abiballs (unter 16, 16–17, 18+). Scanner,
  iOS-App, Gästelisten und Excel zeigen daraus die Bändchenfarbe (zentral in `src/lib/event.ts`, `AGE_GROUPS`)
- Abendkasse im Web-Scanner (`/scanner`, Tab „Abendkasse“): nur Afterparty-Tickets gegen Barzahlung, Gäste sind
  danach direkt eingelassen, mit Kassenstand und Protokoll, wer verkauft hat

## Technik

Next.js 14 (App Router) · TypeScript · Supabase (Postgres) · Stripe · Resend · passkit-generator · pdf-lib

Alle Datenbankzugriffe laufen serverseitig mit dem Service-Role-Key. RLS ist auf allen Tabellen aktiv, es gibt keine
Policies für `anon`/`authenticated` – der Browser kann also nie direkt auf die Datenbank zugreifen. Kapazität und
Kontingente werden atomar in der Datenbankfunktion `create_reservation` geprüft (Advisory Lock), dadurch kann nicht
überbucht werden.

```
src/
  app/                    Seiten und API-Routen
    api/checkout          Reservierung + Stripe Checkout Session
    api/stripe/webhook    Stripe-Webhook (Tickets erzeugen, Mail senden)
    api/admin/...         Admin-Aktionen, Export, Check-in
    admin/...             Admin-Oberfläche und Scanner
  components/             UI-Komponenten
  lib/                    Supabase, Stripe, PDF, Wallet, Mail, ICS
supabase/migrations/      Datenbankschema
```

---

## Einrichtung Schritt für Schritt

### 0. Lokal starten

Voraussetzung: Node.js 18.17 oder neuer.

```bash
npm install
cp .env.example .env.local
npm run dev
```

Die Seite läuft dann unter http://localhost:3000. Für den Admin-Bereich `ADMIN_PASSWORD` und
`ADMIN_SESSION_SECRET` (mindestens 32 Zeichen, z. B. `openssl rand -hex 32`) setzen.

### 1. Supabase

1. Auf https://supabase.com ein Projekt anlegen, Region **EU (Frankfurt)** wählen.
2. Im Projekt **SQL Editor → New query** öffnen, den Inhalt von
   `supabase/migrations/20261116000000_init.sql` einfügen und ausführen.
   Alternativ mit der Supabase CLI: `supabase link --project-ref <ref>` und `supabase db push`.
3. **Project Settings → API**: `Project URL` als `SUPABASE_URL` und den `service_role`-Key als
   `SUPABASE_SERVICE_ROLE_KEY` eintragen. Der Service-Role-Key darf nie im Browser landen
   (er wird nur in Server-Code verwendet).
4. **Preise und Kontingente** im **Table Editor → ticket_types** anpassen. Die Migration legt Platzhalter an
   (Ball 65 €, 300 Plätze; Afterparty 20 €, 100 Plätze). `price_cents` ist in Cent.
   Gesamtkapazität (350), maximale Tickets pro Bestellung (8) und ob der Verkauf offen ist, stehen in
   **settings** (`total_capacity`, `max_per_order`, `sales_open`).

### 2. Stripe (Testmodus)

Ein Stripe-Konto ist bereits vorhanden. Alles läuft zunächst im **Testmodus** – das endgültige Zahlungskonto
wird später hinterlegt.

1. Im Stripe-Dashboard oben rechts **Testmodus** einschalten.
2. **Entwickler → API-Schlüssel**: den geheimen Schlüssel (`sk_test_…`) als `STRIPE_SECRET_KEY` eintragen.
3. **Zahlungsmethoden** (Einstellungen → Zahlungen → Zahlungsmethoden): **Karten**, **Apple Pay** und
   **Google Pay** aktivieren. Der Checkout lässt nur Kartenzahlungen zu; Apple Pay und Google Pay laufen technisch
   darüber und erscheinen automatisch auf passenden Geräten.
4. **Webhook anlegen** (Entwickler → Webhooks → Endpunkt hinzufügen):
   - URL: `https://<deine-domain>/api/stripe/webhook`
   - Ereignisse: `checkout.session.completed`, `checkout.session.async_payment_succeeded`,
     `checkout.session.async_payment_failed`, `checkout.session.expired`, `charge.refunded`
   - Das **Signing Secret** (`whsec_…`) als `STRIPE_WEBHOOK_SECRET` eintragen.
5. **Lokal testen** mit der Stripe CLI:
   ```bash
   stripe login
   stripe listen --forward-to localhost:3000/api/stripe/webhook
   ```
   Das dabei angezeigte `whsec_…` lokal als `STRIPE_WEBHOOK_SECRET` verwenden.
   Testkarte: `4242 4242 4242 4242`, beliebiges zukünftiges Datum, beliebige Prüfziffer.
6. **Apple-Pay-Domain registrieren** (Einstellungen → Zahlungen → Zahlungsmethoden → Apple Pay →
   Domains / „Zahlungsmethoden-Domains“): Bei Stripe Checkout läuft die Zahlung auf `checkout.stripe.com`,
   dafür ist keine eigene Domain-Verifizierung nötig. Die eigene Domain trotzdem unter
   **Einstellungen → Zahlungsmethoden-Domains** hinzufügen, falls später Apple Pay direkt auf der Seite
   (Payment Element) genutzt werden soll – dann die von Stripe bereitgestellte Datei unter
   `public/.well-known/apple-developer-merchantid-domain-association` ablegen.
7. **Wechsel auf das endgültige Konto / Livemodus:** `STRIPE_SECRET_KEY` durch `sk_live_…` ersetzen,
   den Webhook im Livemodus neu anlegen und dessen `whsec_…` eintragen. Sonst ist nichts zu ändern.

Die Checkout-Session läuft nach 30 Minuten ab (Stripe-Minimum). Bis dahin sind die Plätze reserviert; bei Ablauf
setzt der Webhook die Bestellung auf „abgelaufen“, unabhängig davon werden abgelaufene Reservierungen automatisch
nicht mehr mitgezählt.

### 3. Resend (E-Mail)

1. Auf https://resend.com ein Konto anlegen.
2. **Domains → Add Domain**, eigene Domain eintragen und die angezeigten DNS-Einträge (SPF, DKIM) beim
   Domain-Anbieter setzen. Warten, bis die Domain „Verified“ ist.
3. **API Keys → Create API Key** (Berechtigung „Sending access“) und als `RESEND_API_KEY` eintragen.
4. `MAIL_FROM` setzen, z. B. `Abiball 2027 <tickets@deine-domain.de>`. Optional `MAIL_REPLY_TO`.

Ohne verifizierte Domain kann Resend nur an die eigene Konto-Adresse senden – zum Testen reicht das.

### 4. Apple Wallet (Pass Type ID)

Voraussetzung: Mitgliedschaft im Apple Developer Program (99 €/Jahr).

1. https://developer.apple.com/account → **Certificates, Identifiers & Profiles → Identifiers → +**,
   Typ **Pass Type IDs**, z. B. `pass.de.deine-domain.abiball2027`. Als `APPLE_PASS_TYPE_ID` eintragen.
2. Die **Team ID** (oben rechts im Developer-Account) als `APPLE_TEAM_ID` eintragen.
3. Zertifikat erstellen:
   ```bash
   openssl genrsa -out pass.key 2048
   openssl req -new -key pass.key -out pass.csr -subj "/CN=Abiball 2027/O=Abiturjahrgang 2027/C=DE"
   ```
   Bei der Pass Type ID **Create Certificate** wählen, `pass.csr` hochladen und `pass.cer` herunterladen.
   ```bash
   openssl x509 -inform der -in pass.cer -out signerCert.pem
   ```
4. Apple-WWDR-Zwischenzertifikat (G4) von https://www.apple.com/certificateauthority/ laden:
   ```bash
   openssl x509 -inform der -in AppleWWDRCAG4.cer -out wwdr.pem
   ```
5. Base64-kodiert eintragen:
   ```bash
   base64 -i wwdr.pem | tr -d '\n'        # → APPLE_WWDR_CERT_BASE64
   base64 -i signerCert.pem | tr -d '\n'  # → APPLE_SIGNER_CERT_BASE64
   base64 -i pass.key | tr -d '\n'        # → APPLE_SIGNER_KEY_BASE64
   ```
   Falls der Schlüssel ein Passwort hat: `APPLE_SIGNER_KEY_PASSPHRASE`.
6. Die Schlüsseldateien danach sicher aufbewahren und **nicht** ins Repo legen (`*.pem`, `*.p12` stehen in
   `.gitignore`).

Ohne diese Variablen funktioniert alles andere weiter, nur die `.pkpass`-Dateien und Apple-Wallet-Buttons
fehlen. Für die Live-Seite sollten die offiziellen „Add to Apple Wallet“-Badges von Apple verwendet werden.

### 5. Google Wallet

1. https://pay.google.com/business/console → **Google Wallet API** → Issuer-Konto anlegen. Die
   **Issuer ID** als `GOOGLE_WALLET_ISSUER_ID` eintragen.
2. In der Google Cloud Console ein Projekt anlegen, **Google Wallet API** aktivieren,
   **IAM → Dienstkonten → Dienstkonto erstellen** und einen **JSON-Schlüssel** herunterladen.
3. In der Pay & Wallet Console unter **Nutzer** die E-Mail-Adresse des Dienstkontos mit der Rolle
   „Entwickler“ hinzufügen.
4. JSON base64-kodiert eintragen: `base64 -i key.json | tr -d '\n'` → `GOOGLE_WALLET_SERVICE_ACCOUNT_BASE64`.
5. Solange das Issuer-Konto im Demo-Modus ist, können nur als Tester eingetragene Google-Konten Tickets speichern.
   Für alle Nutzer in der Console **Publishing access** beantragen.

Der Link enthält einen signierten JWT mit Ticket-Klasse und Ticket-Objekten – es ist kein weiterer API-Aufruf nötig.

### 6. Deployment (z. B. Vercel)

1. Repository bei Vercel importieren.
2. Alle Variablen aus `.env.example` unter **Settings → Environment Variables** eintragen,
   `NEXT_PUBLIC_SITE_URL` auf die echte Domain setzen.
3. Nach dem ersten Deployment die Webhook-URL in Stripe auf die echte Domain setzen.

### 7. Vor dem Verkaufsstart

- [ ] Preise und Kontingente in `ticket_types` prüfen
- [ ] Impressum, Datenschutz und AGB vollständig ausfüllen und prüfen lassen (`src/app/impressum`, `datenschutz`, `agb`)
- [ ] Testkauf im Stripe-Testmodus inkl. Mail, PDF, Wallet und Scanner
- [ ] Erstattung im Admin testen
- [ ] Auf Live-Schlüssel umstellen

## Einlass

`/admin/scanner` auf dem Handy öffnen (HTTPS nötig für die Kamera), anmelden, **Kamera starten**.
Grün = Einlass OK, Orange = bereits eingelassen (mit Uhrzeit des ersten Scans), Rot = unbekannt oder storniert.
Codes können auch manuell eingegeben werden (`WG27-XXXX-XXXX-XXXX`). Jeder Scan wird in `checkins` protokolliert.

Bei gültigen Tickets erscheint groß die Altersgruppe mit Bändchenfarbe (Rot unter 16, Gelb 16–17, Grün 18+).
Tickets aus der Zeit vor der Altersabfrage zeigen „Alter fehlt“; das Alter lässt sich im Admin unter
„Daten bearbeiten“ nachtragen.

**Abendkasse:** Im Web-Scanner (`/scanner`) gibt es den Tab „Abendkasse“. Dort verkauft das Einlass-Team nur
Afterparty-Tickets (`EVENT.doorTicketTypeId`) gegen Bargeld, mit Name und Alter laut Ausweis. Die Gäste sind danach
direkt eingelassen. Unten steht, wie viel Geld in der Kasse sein sollte. Kontingent und Gesamtkapazität gelten auch
hier, auch wenn der Online-Verkauf geschlossen ist.

**Migration:** `supabase/migrations/20261116070000_altersgruppen_abendkasse.sql` vor dem Deployment ausführen.

## Befehle

```bash
npm run dev        # Entwicklung
npm run build      # Produktions-Build
npm run start      # Produktions-Server
npm run typecheck  # TypeScript prüfen
```

## Datenbank-Migrationen automatisch (GitHub Actions)

`.github/workflows/supabase-migrations.yml` spielt neue Dateien in `supabase/migrations/` beim Merge auf `main`
in die Produktions-Datenbank ein (bei Pull Requests nur Probelauf).

Einrichtung (einmalig):
1. GitHub → Settings → Secrets and variables → Actions → **New repository secret** `SUPABASE_DB_URL`
   (Supabase → Project Settings → Database → Connection string → *Session pooler*, Passwort eingesetzt).
2. GitHub → Actions → „Supabase-Migrationen“ → **Run workflow** mit Baseline der bereits von Hand ausgeführten Versionen,
   z. B. `20261116000000 20261116020000 20261116030000 20261116040000 20261116050000 20261116060000`.
   Danach führt der Workflow alle noch fehlenden Migrationen (z. B. Altersgruppen, Bändchenfarben) aus.

## Bändchenfarben

Admin → Einstellungen → **Bändchenfarben**: Name und Farbe je Altersgruppe. Web-Scanner, iOS-App (`wristband_name`,
`wristband_color` in den Scanner-APIs), Gästeliste und Excel übernehmen sie sofort.
