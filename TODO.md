# TODO & Roadmap für LOCAL (Lokale Offline Chat Anwendungs-Logik)

Dieses Dokument erfasst den aktuellen Umsetzungsstatus, die Härtungsmaßnahmen, Architektur-Entscheidungen und die nächsten priorisierten Aufgaben für **LOCAL**.

---

## 1. Abgeschlossene Meilensteine

- [x] **Zero-Dependency Single-File Basis-Architektur (`index.html`):**
  Vollständige Chat-Anwendung in einer einzigen, autarken HTML-Datei ohne externe Abhängigkeiten, Bundler oder npm-Module.
- [x] **Chrome Built-in AI Integration (`window.LanguageModel`):**
  Direkte Anbindung an Gemini Nano via nativer Chrome Prompt API; lokales Streaming (`promptStreaming`) mit frame-gebündeltem DOM-Rendering (`requestAnimationFrame`).
- [x] **Smart Context Compression (Sliding-Window):**
  Automatischer Schutz vor Context-Overflows (OOM / Token Limits) durch Zusammenfassung älterer Dialoge mit temporärer Archivar-Session und nahtloser Re-Injektion.
- [x] **Multi-Session LocalStorage Persistenz:**
  Verwaltung mehrerer Chatverläufe mit automatischer Titelerkennung, Debounce-Speicherung (2000 ms) und Session-Umschaltung in der Seitenleiste.
- [x] **Integrierte Iframe-Codesandbox:**
  Ausführung von HTML/JS-Codeblöcken in einem isolierten `<iframe>` (`sandbox="allow-scripts"` ohne `allow-same-origin`).
- [x] **Sprach- und Multimedia-Funktionen:**
  Spracheingabe via Web Speech API (`SpeechRecognition`) und Vorlesen via `speechSynthesis`.
- [x] **Kontext-Injektion:**
  Drag & Drop FileReader für Text/Code-Dateien (`.txt`, `.md`, `.csv`, `.json`, etc.) und Webseiten-Scraping über CORS-Proxy.
- [x] **Integriertes Debug-Terminal:**
  Echtzeit-Error-Handling (`window.onerror`, `unhandledrejection`), Tastenbelegung `Strg+D`, Log-Exportfunktion als `.log`.

---

## 2. Abgeschlossene Härtungs- & Wartbarkeits-Meilensteine

- [x] **Robuste API-Erkennung & Standard-Harmonisierung:**
  Unterstützung sowohl für `window.LanguageModel` als auch `window.ai.languageModel` (Chrome Spezifikations-Wandel). Robuste Parameterübergabe für `create()` und `availability()` / `capabilities()`.
- [x] **Kryptografische Token-Kollisionssicherheit im Markdown-Parser:**
  Ersetzen der vorhersehbaren Platzhalter (`%%%CODE_BLOCK_0%%%`) durch kryptografisch eindeutige Delimiter (`Math.random() + Date.now()`), um gezielte oder zufällige Textkollisionen auszuschließen.
- [x] **Behebung des HTML-Entity Mangles im Syntax-Highlighter:**
  Der Tokenizer tokenisiert den Quelltext vor dem Escaping in atomare Tokens und encodiert jedes Token separat. Dadurch bleiben HTML-Entities (z. B. `&#039;`, `&amp;`) unberührt.
- [x] **Regenerate- & History-Logik Bereinigung:**
  Beseitigung der doppelten Prompt-Injektion beim Neu-Generieren: Das auslösende User-Element wird beim Wiederaufbau der Historie via CSS-Marker `regenerating-skip` gezielt ausgelassen.
- [x] **LocalStorage Quota-Guard & UI-Feedback:**
  Präzises Abfangen von `QuotaExceededError` mit optischem Feedback im UI, anstatt stumm im Hintergrund zu scheitern.
- [x] **CORS-Proxy Datenschutz-Transparenz & Konfigurierbarkeit:**
  Konfigurierbare Proxy-URL und Toggle im Einstellungsmenü mit Timeout-AbortController und Warnmeldung bei Fehlern.
- [x] **Codesandbox-Erweiterung (Reset & Toggle):**
  Möglichkeit, geöffnete Sandboxes jederzeit mit `⏹ Schließen` einzuklappen und zu entladen (`srcdoc = ''`).
- [x] **Automatisierte Testsuite & Validierungs-Harness (`tests/`):**
  Headless Test-Suite mit Node.js built-in Test-Runner (`npm test` und `tests/run_tests.sh`, 43/43 Tests grün) für:
  - Markdown-Sanitization, XSS-Schutz & Token-Kollisionssicherheit
  - Syntax-Highlighting & HTML-Entity Immunität
  - Roundtrip Multi-Turn Export/Import & Kontext-Slicing (SAFE_INIT_CHARS)
  - Synchrone & asynchrone Token-Zählung mit Heuristik-Fallback
  - Systemdiagnose-Matrix (NO_FLAGS, NEEDS_DOWNLOAD, PERF_OR_STORAGE_BLOCKED, READY via readily/available, NON_CHROMIUM)
  - Versions-Konsistenz (package.json, CONFIG, DOM-Badges)
  - Webseiten-Extraktion (XSS-Schutz, Junk-Tag Stripping, 3.500-Zeichen-Limit)
  - URL-Erkennung & sicheres Proxy-Encoding (Parameter-Pollution-Schutz)
  - Auto-Titel-Generierung & LocalStorage-Robustheit bei korruptem JSON
  - Prompt-Deduplizierung bei Regenerierung (`regenerating-skip`)
  - Statisches Sicherheits-Audit: Strikte Sandbox-Isolation (`sandbox="allow-scripts"` ohne `allow-same-origin`)
  - Strukturierter Markdown-Export (`.md`) mit Headings, Zitaten und Codeblöcken
  - Maschinenlesbarer JSON-Export (`.json`) mit Timestamps und Rollen
  - Persona-Presets & Zwei-Wege-Synchronisation mit Freitextfeld
  - WebGPU Hardware-Erkennung (`navigator.gpu`) & Fallback-Matrix
  - Einheitlicher Streaming-Session-Vertrag für Hybrid-Engines (`promptStreaming`, `destroy`, Tokens)
  - Engine-Routing mit striktem Vorrang für native Chrome Prompt API
  - Diagnose-UI: Bedingte Einblendung des WebGPU-Download-Buttons (nur bei vorhandener Hardware)
  - UI-Telemetrie & Badge-Status Farbkodierung (Grün für Chrome Nano, Lila für WebGPU, Gelb, Rot)
  - Session-Lifecycle & GPU/RAM-Leak-Prävention bei Engine-Wechsel (`session.destroy()`)
  - WebGPU Token-Budgetierung & dynamisches Kontext-Slicing (Sicherheitsgrenzen für 2048 Tokens)
  - Indirect Prompt Injection Schutz & Data-Boundary Kapselung (`wrapUntrustedContent`)
  - PWA Web-App-Manifest Validierung (`manifest.json` und Icon-Auflösung)
  - PWA Service Worker Cache-Strategie & Asset-Integrität (`sw.js`)
  - **Modell-Streaming Interaktion:** Inkrementelle Token-Chunks & Realtime Markdown-Rendering
  - **Interaktions-Abbruch (Abort):** Sicherung von Teilergebnissen bei Stopp-Signal
  - **Stream-Exception Handling:** Abfangen von Modell-Crashes & garantierte UI-Entsperrung im Finally-Block
  - **Multi-Turn Kontext:** Verlaufsspeicherung und formatierte Re-Injektion in Folgeprompts
  - **Robuste API-Initialisierung:** `create(options)`-Fallback bei Browser-Inkompatibilitäten
  - **Interaktions-Parität:** Einheitliches Verhalten von Chrome Gemini Nano und WebGPU SmolLM2
  - **WebGPU Ausweichmodell-Download:** Telemetrie, Fortschrittsberechnung und Statusanzeige (`initProgressCallback`)
  - **WebGPU Delta-Streaming:** OpenAI-kompatible Chunk-Transformation und Filterung leerer Start/Stop-Deltas
  - **WebGPU VRAM-Freigabe:** `engine.unload()` über Session-Lifecycle
  - **WebGPU Fehlertoleranz:** Exception-Handling bei Treiberabsturz (Device Lost) und Abbruch
- [x] **Indirect Prompt Injection Abwehr & Data-Boundaries [v1.4.0]:**
  - Kapselung aller extern geladenen Webseiten- und Datei-Inhalte in strukturierte Sicherheits-Tags (`<untrusted_content source="..." type="...">`).
  - Expliziter System-Warnhinweis vor jedem externen Datenblock: Modell wird angewiesen, enthaltene Befehle strikt als passive Nutzlast zu behandeln.
  - Neutralisierung potenzieller Escape-Versuche (Maskierung innerer `</untrusted_content>`-Tags) und Bereinigung von Attribut-Injektionen.
- [x] **Installierbare Progressive Web App (PWA & Offline-First) [v1.4.0]:**
  - **`manifest.json`:** Ermöglicht die Installation von `LOCAL` als eigenständige Desktop-App ohne Browser-URL-Leiste (`display: standalone`).
  - **`icon.svg`:** Vektor-App-Icon (512x512) im einheitlichen Neural-Core-Design (Cyan/Lila mit Slate-Hintergrund).
  - **`sw.js`:** Schlanker Service Worker mit Cache-First- und Stale-While-Revalidate-Strategie für alle lokalen Kern-Assets (`index.html`, `manifest.json`, `icon.svg`).
  - **Robuster Guard:** Service-Worker-Registrierung wird nur bei `http:` / `https:` ausgeführt; kein Fehleraufkommen bei lokalem Doppelklick (`file://`).
  - Vollständige Offline-Lauffähigkeit bei lokalem Webserver (`http://localhost`).

---

## 3. Zukünftige Optimierungspotenziale (Backlog – nach Priorität sortiert)

### Priorität 1: Modellauswahl & VRAM-Stufen für WebGPU
- [ ] **Optionale Modell-Presets im Einstellungen-Panel:**
  Ermöglicht Nutzern mit dedizierter Grafikkarte die Wahl zwischen `SmolLM2-135M` (Standard, ultrakompakt) und größeren Modellen wie `SmolLM2-360M` oder `Qwen2.5-0.5B`.

### Priorität 2: Erweiterte Tastatur-Navigation & a11y
- [ ] **Barrierefreiheit & Escape-Handling:**
  `Escape`-Taste zum Schließen von Modals, Dropdowns und Sandboxes; automatischer Fokus-Rücksprung ins Textfeld.

### Priorität 3: Druck- / PDF-Export
- [ ] **Clean Print-CSS (`window.print()`):**
  Druckoptimiertes Stylesheet zum sauberen PDF-Export ohne UI-Buttons, Header oder Sidebar.
