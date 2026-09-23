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
  Headless Test-Suite mit Node.js built-in Test-Runner (`npm test` und `tests/run_tests.sh`, 20/20 Tests grün) für:
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
- [x] **Cross-Platform Hotkey Support:**
  Unterstützung von `Cmd` (MetaKey) für macOS bei allen Tastenkombinationen (`Cmd+D`, `Cmd+B`, `Cmd+S`, `Cmd+O`, `Cmd+L`, `Cmd+M`).
- [x] **Lückenlose Dokumentation:**
  Korrektur des Dateinamens im `README.md` (`index.html` und Symlink `chat.html`), Hinzufügen von `ARCHITECTURE.md` und sauberen JSDoc-Kommentaren im Quelltext.
- [x] **Echte Token-Zählung via Chrome Prompt API:**
  Zweistufige Telemetrie mit synchroner Abfrage von `tokensSoFar` / `maxTokens` und debounctem asynchronen `countPromptTokens()`. Direkte Visualisierung im Header-Badge (`📊 X / Y Tok (Z%)`) und robuster Zeichen-Heuristik-Fallback.
- [x] **Automatisierte Systemdiagnose & Onboarding-Troubleshooter (Windows / macOS / Linux):**
  Interaktive Diagnose-Engine (`checkSystemEnvironment()` / `evaluateDiagnosis()`):
  - Automatische Identifikation des Ursachenzustands (`NO_FLAGS`, `NEEDS_DOWNLOAD`, `PERF_OR_STORAGE_BLOCKED`, `NON_CHROMIUM`, `READY`).
  - Spezifische Handlungsanleitungen für Windows (Laufwerk C: Speicherplatz, `chrome://components` Optimization Guide Update, `Enabled BypassPerfRequirement`, Metered Connection).
  - Interaktive Diagnose-Karte im Chat mit Checkliste, Re-Test-Button (`🔄 Erneut prüfen`) und Button zum Öffnen des Debug-Terminals.
  - Diagnose per Klick auf die Status-Pille im Header oder über den Diagnose-Button im Persona-Panel jederzeit abrufbar.
  - Vollständige Regressionstest-Abdeckung in `tests/test_local.js` (15/15 Tests grün).

---

## 3. Zukünftige Optimierungspotenziale (Backlog – nach Priorität sortiert)

### Priorität 1 (Hoch): Erweiterte Export-Formate (Markdown & JSON)
- [ ] **Strukturierte Dokumenten-Exporte:**
  Export von Unterhaltungen wahlweise als:
  - **Markdown (`.md`):** Sauber formatierter Text mit echten Headings, Codeblöcken und Zitaten (ideal für Obsidian, Notion und GitHub).
  - **JSON (`.json`):** Maschinenlesbare Struktur mit Timestamps, Rollen (`user`, `assistant`, `system`) und Token-Statistiken für automatisierte Weiterverarbeitung.
  - Erhalt des bestehenden `.txt`-Formats für maximale Abwärtskompatibilität beim Chat-Import.

### Priorität 2 (Mittel): System-Prompt Presets (Persona-Vorlagen)
- [ ] **Vordefinierte Experten-Rollen im Persona-Panel:**
  Schnellwahl-Dropdown im Einstellungsmenü für kuratierte System-Prompts (z. B. „Code-Reviewer & Refactoring-Spezialist“, „Prüftechniker / Sicherheits-Auditor“, „Kritischer Sparringspartner“, „Präziser Übersetzer“).

### Priorität 3 (Langfristig): Wasm / WebGPU Fallback (Hybrid-Engine)
- [ ] **Plattformunabhängige In-Browser-KI via WebGPU:**
  Optionale Integration einer WebGPU/Wasm-Engine (z. B. WebLLM / transformers.js mit SmolLM oder Qwen) als automatischer Fallback für Browser ohne native Chrome Prompt API (Firefox, Safari, Chromium-Forks).

### Priorität 4 (Optional / Nachgelagert): Offline PWA & Service Worker
- [ ] **Installierbare Desktop-App (Progressive Web App):**
  Bereitstellung eines `manifest.json` und eines Service Workers zum vollständigen Caching aller Assets (Icons, HTML, CSS, JS) bei Bereitstellung über `http://localhost`. Ermöglicht die Installation als Desktop-App mit eigenem Fenster.
