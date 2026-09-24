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
  Headless Test-Suite mit Node.js built-in Test-Runner (`npm test` und `tests/run_tests.sh`, 26/26 Tests grün) für:
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
- [x] **Wasm / WebGPU Hybrid-Engine (Opt-In Fallback):**
  - **Chrome Prompt API bleibt strikte Priorität 1:** In Google Chrome wird weder externer Code noch Modellgewichte geladen (0 Byte Overhead, 100 % nativer Pfad).
  - **Bedarfsgesteuerter Fallback (Opt-In):** Ausschließlich bei fehlender Prompt API (Firefox, Safari, unkonfigurierter Chromium) bietet die Diagnose-Karte bei erkannter WebGPU-Hardware den Button *„⚡ WebGPU-Fallback laden (~90 MB)“*.
  - **Dynamischer ESM-Import:** Lädt WebLLM (`@mlc-ai/web-llm`) und das leichtgewichtige `SmolLM2-135M-Instruct-q4f16_1-MLC` mit Live-Download-Fortschritt im Header-Badge.
  - **Einheitlicher Session-Adapter:** Kapselt das OpenAI-kompatible Streaming von WebLLM in dasselbe Async-Iterable-Interface (`promptStreaming`) wie die Chrome Prompt API – UI, Chat-History und Context-Bar arbeiten transparent weiter.
  - **Transparente UI-Farbkodierung:** `🟢 Gemini Nano bereit` (nativ grün) vs. `🟣 WebGPU: SmolLM2 bereit` (Fallback lila).

---

## 3. Zukünftige Optimierungspotenziale (Backlog – nach Priorität sortiert)

### Priorität 1 (Optional / Nachgelagert): Offline PWA & Service Worker
- [ ] **Installierbare Desktop-App (Progressive Web App):**
  Bereitstellung eines `manifest.json` und eines Service Workers zum vollständigen Caching aller Assets (Icons, HTML, CSS, JS) bei Bereitstellung über `http://localhost`. Ermöglicht die Installation als Desktop-App mit eigenem Fenster.
