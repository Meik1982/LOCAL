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
  Headless Test-Suite mit Node.js built-in Test-Runner für Markdown-Sanitization, XSS-Schutz, Syntax-Highlighting und Roundtrip-Export/Import (`npm test` und `tests/run_tests.sh`).
- [x] **Cross-Platform Hotkey Support:**
  Unterstützung von `Cmd` (MetaKey) für macOS bei allen Tastenkombinationen (`Cmd+D`, `Cmd+B`, `Cmd+S`, `Cmd+O`, `Cmd+L`, `Cmd+M`).
- [x] **Lückenlose Dokumentation:**
  Korrektur des Dateinamens im `README.md` (`index.html` und Symlink `chat.html`), Hinzufügen von `ARCHITECTURE.md` und sauberen JSDoc-Kommentaren im Quelltext.
- [x] **Echte Token-Zählung via Chrome Prompt API:**
  Zweistufige Telemetrie mit synchroner Abfrage von `tokensSoFar` / `maxTokens` und debounctem asynchronen `countPromptTokens()`. Direkte Visualisierung im Header-Badge (`📊 X / Y Tok (Z%)`) und robuster Zeichen-Heuristik-Fallback.

---

## 3. Zukünftige Optimierungspotenziale (Backlog)

- [ ] **Offline PWA & Service Worker:**
  Bereitstellung eines `manifest.json` und eines Service Workers zum vollständigen Caching der App, sodass `LOCAL` auch als installierbare Desktop-App ohne lokalen Webserver offline gestartet werden kann.
- [ ] **Wasm/WebGPU Fallback (Hybrid-Mode):**
  Optionaler Fallback auf In-Browser-Modelle via WebGPU (z. B. WebLLM / ONNX Runtime Web / transformers.js) für Systeme und Browser ohne aktivierte Chrome Prompt API (Firefox, Safari, Chromium-Forks).
- [ ] **Erweiterte Export-Formate:**
  Export von Unterhaltungen nicht nur als `.txt`, sondern wahlweise als sauberes Markdown (`.md`) oder strukturiertes JSON (`.json`) mit Rollen-Metadaten.
- [ ] **System-Prompt Presets:**
  Auswahl vordefinierter System-Prompts (z. B. „Senior Software Engineer“, „Übersetzer“, „Kritischer Reviewer“) direkt im Persona-Panel.
