# Persönlichkeitstest (eddydate.com)

Interaktive Landingpage mit einem humorvollen Persönlichkeitstest für Dating-Matches. Besucher durchlaufen ein kurzes Quiz, erhalten ein Ergebnis (Green Flag, Charmantes Problem, Certified Disaster oder Game Over) und können optional per WhatsApp weiterschreiben.

Während des Besuchs werden Ereignisse live an Telegram gemeldet. Abgebrochene Sessions werden nach Inaktivität automatisch abgeschlossen.

## Funktionen

- **Quiz-Flow** — Intro, drei Fragen, personalisiertes Ergebnis
- **Personalisierung** — Name über URL-Parameter `?id=anna` (wird zu „Anna“ formatiert)
- **Live-Telegram-Stream** — Eine Telegram-Nachricht wird bei jedem Schritt aktualisiert (Seitenaufruf, Antworten, Ergebnis, WhatsApp-Klick)
- **Session-Timeout** — Unvollständige Sessions werden nach 5 Minuten Inaktivität per Cron-Worker finalisiert
- **Besuchszähler** — Optionaler KV-Zähler für Gesamtbesuche und Besuche pro IP
- **Analytics** — Google Analytics 4 (`G-5YLD0LB28R`)

## Architektur

```
Browser (index.html, script.js, styles.css)
    │
    ├─► POST /api/notify     → Cloudflare Pages Function (functions/api/notify.js)
    │                              ├─► Telegram Bot API
    │                              └─► KV: SESSIONS, VISIT_COUNTER
    │
    └─► GET  /api/health     → Konfigurations-Check (functions/api/health.js)

Cron (alle 2 Min.)           → Cloudflare Worker (workers/session-timeout.js)
                                   └─► Finalisiert abgelaufene Sessions in KV
```

| Komponente | Technologie | Zweck |
|---|---|---|
| Frontend | Statisches HTML/CSS/JS | Quiz-UI und Event-Tracking |
| API | Cloudflare Pages Functions | Telegram-Benachrichtigungen, Session-Speicher |
| Timeout-Worker | Cloudflare Worker + Cron | Automatisches Abschließen inaktiver Sessions |
| Persistenz | Cloudflare KV | Live-Sessions (`SESSIONS`), Besuchszähler (`VISIT_COUNTER`) |
| Secrets | Wrangler Secrets / `.dev.vars` | `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID` |

## Projektstruktur

```
.
├── index.html              # Seiten-Markup
├── script.js               # Quiz-Logik, Tracking, API-Aufrufe
├── styles.css              # Styling
├── _headers                # Cloudflare Pages Headers (Permissions-Policy)
├── functions/
│   ├── api/
│   │   ├── notify.js       # POST /api/notify — Telegram-Updates
│   │   └── health.js       # GET /api/health — Konfigurationsdiagnose
│   └── lib/
│       ├── session.js      # KV-Session-Verwaltung, Timeout-Logik
│       └── telegram.js     # Nachrichtenformatierung, Telegram-API
├── workers/
│   ├── session-timeout.js  # Cron-Handler für Session-Timeout
│   ├── wrangler.toml       # Worker-Konfiguration
│   └── test-session-timeout.mjs
├── wrangler.toml           # Pages-Konfiguration (KV-Bindings)
├── .dev.vars.example       # Vorlage für lokale Secrets
└── package.json
```

## Voraussetzungen

- [Node.js](https://nodejs.org/) (LTS empfohlen)
- [Cloudflare-Account](https://dash.cloudflare.com/) mit Wrangler CLI
- Telegram-Bot (Token von [@BotFather](https://t.me/BotFather)) und Chat-ID

## Lokale Entwicklung

### 1. Abhängigkeiten installieren

```bash
npm install
```

### 2. Secrets konfigurieren

Kopiere die Beispiel-Datei und trage deine Telegram-Werte ein:

```bash
cp .dev.vars.example .dev.vars
```

`.dev.vars` wird von Wrangler beim lokalen Start geladen und ist in `.gitignore` — **niemals committen**.

### 3. Dev-Server starten

```bash
npm run dev
```

Die Seite läuft standardmäßig unter `http://localhost:8788`. Mit personalisiertem Namen:

```
http://localhost:8788/?id=anna
```

### 4. Session-Timeout lokal testen

Die Timeout-Logik kann ohne Cloudflare-API getestet werden:

```bash
npm run test:session-timeout
```

## Deployment

Das Projekt besteht aus **zwei Cloudflare-Komponenten**, die gemeinsam deployed werden:

| Befehl | Was wird deployed |
|---|---|
| `npm run deploy:pages` | Statische Seite + Pages Functions → Projekt `eddydate-com` |
| `npm run deploy:timeout-worker` | Cron-Worker `eddydate-session-timeout` |
| `npm run deploy` | Beides nacheinander |

### Erstmaliges Setup

#### 1. Bei Cloudflare anmelden

```bash
npx wrangler login
```

#### 2. KV-Namespaces anlegen (falls noch nicht vorhanden)

```bash
# Erforderlich für Session-Timeout
npx wrangler kv namespace create SESSIONS

# Optional für Besuchszähler
npx wrangler kv namespace create VISIT_COUNTER
```

Die zurückgegebene Namespace-ID in `wrangler.toml` (Root) und `workers/wrangler.toml` eintragen.

#### 3. KV-Bindings im Pages-Dashboard

Unter **Workers & Pages → eddydate-com → Settings → Functions → KV namespace bindings**:

| Variable name | Namespace |
|---|---|
| `SESSIONS` | SESSIONS |
| `VISIT_COUNTER` | VISIT_COUNTER (optional) |

#### 4. Secrets setzen

**Für Pages (API-Funktionen):**

```bash
npx wrangler pages secret put TELEGRAM_BOT_TOKEN --project-name=eddydate-com
npx wrangler pages secret put TELEGRAM_CHAT_ID --project-name=eddydate-com
```

**Für den Timeout-Worker:**

```bash
npx wrangler secret put TELEGRAM_BOT_TOKEN -c workers/wrangler.toml
npx wrangler secret put TELEGRAM_CHAT_ID -c workers/wrangler.toml
```

#### 5. Deployen

```bash
npm run deploy
```

### Produktions-URL

- **Live:** [eddydate.com](https://eddydate.com)
- **Preview:** `*.eddydate-com.pages.dev` (automatisch bei Pages-Deployments)

## Debugging

### Health-Check

Der schnellste Weg, die Backend-Konfiguration zu prüfen:

```
GET /api/health
```

Beispiel lokal: `http://localhost:8788/api/health`

Die Antwort zeigt:

- ob `TELEGRAM_BOT_TOKEN` und `TELEGRAM_CHAT_ID` gesetzt sind (inkl. Länge, ohne Werte preiszugeben)
- ob KV-Bindings `SESSIONS` und `VISIT_COUNTER` verfügbar sind
- welche Runtime-Variablen insgesamt vorhanden sind

### Häufige Probleme

| Symptom | Mögliche Ursache | Lösung |
|---|---|---|
| `500` mit `not_configured` bei `/api/notify` | Telegram-Secrets fehlen | Secrets setzen (siehe oben), danach neu deployen |
| `403 Forbidden` bei `/api/notify` | Request von nicht erlaubtem Host | Nur `localhost`, `eddydate.com` und `*.eddydate-com.pages.dev` sind erlaubt |
| `502 Telegram error` | Ungültiger Bot-Token oder Chat-ID | Token/Chat-ID prüfen; Bot muss Nachrichten an den Chat senden dürfen |
| Keine Live-Updates in Telegram | Frontend-Fehler oder API nicht erreichbar | Browser-Netzwerk-Tab → `POST /api/notify` prüfen |
| Session wird nicht automatisch abgeschlossen | Worker nicht deployed oder KV fehlt | `npm run deploy:timeout-worker`; `SESSIONS`-Binding prüfen |
| Besuchszähler zeigt `—` | `VISIT_COUNTER`-KV nicht gebunden | Binding im Pages-Dashboard setzen (optional) |

### API manuell testen

```bash
curl -X POST http://localhost:8788/api/notify \
  -H "Content-Type: application/json" \
  -H "Origin: http://localhost:8788" \
  -d '{"name":"Test","path":"/","referrer":"direkt","events":[{"t":"2026-07-03T12:00:00.000Z","event":"page_view"}],"finished":false}'
```

Bei Erfolg: `{"ok":true,"messageId":12345}` und eine neue Telegram-Nachricht.

### Browser / Frontend

- **sessionStorage** speichert `messageId` und Event-Historie zwischen Seitenaufrufen (`telegram_stream_*`-Keys in `script.js`). Zum Zurücksetzen: DevTools → Application → Session Storage löschen.
- **Netzwerk-Tab:** Jeder getrackte Schritt löst `POST /api/notify` aus. Fehlgeschlagene Requests (4xx/5xx) werden still ignoriert — dort liegt oft die Ursache.
- **Google Analytics:** Events erscheinen in GA4 unter dem Property `G-5YLD0LB28R`.

### Cloudflare-Logs

**Pages Functions (lokal):**

```bash
npm run dev
```

Wrangler zeigt Request-Logs und Fehler direkt in der Konsole.

**Worker (Produktion):**

```bash
npx wrangler tail eddydate-session-timeout -c workers/wrangler.toml
```

Der Cron-Worker loggt z. B. `Finalized N timed-out session(s)` bei erfolgreicher Ausführung.

### Session-Timeout verifizieren

1. Quiz starten, aber nicht abschließen
2. 5+ Minuten warten (Timeout: `SESSION_TIMEOUT_MS` in `functions/lib/session.js`)
3. Cron-Worker läuft alle 2 Minuten (`*/2 * * * *` in `workers/wrangler.toml`)
4. Telegram-Nachricht sollte auf „Abgeschlossen“ wechseln mit Event „Session beendet (Inaktivität)“

Alternativ die Unit-Tests ausführen:

```bash
npm run test:session-timeout
```

## Umgebungsvariablen

| Variable | Wo setzen | Beschreibung |
|---|---|---|
| `TELEGRAM_BOT_TOKEN` | `.dev.vars` (lokal), Pages Secrets, Worker Secrets | Bot-Token von BotFather |
| `TELEGRAM_CHAT_ID` | `.dev.vars` (lokal), Pages Secrets, Worker Secrets | Ziel-Chat für Benachrichtigungen |
| `SESSIONS` | KV-Binding in `wrangler.toml` + Pages Dashboard | Live-Sessions für Timeout |
| `VISIT_COUNTER` | KV-Binding in `wrangler.toml` + Pages Dashboard | Optionaler Besuchszähler |

## Lizenz

Privates Projekt (`"private": true` in `package.json`).
