# LOCAL (Lokale Offline Chat Anwendungs-Logik)

Ein vollständig lokaler, offline-fähiger KI-Chat-Client (**Zero-Dependency**), der direkt im Browser läuft. Die gesamte Anwendung besteht aus einer einzigen, hochoptimierten HTML-Datei (`index.html`) und greift nativ auf die integrierte Chrome-KI (**Gemini Nano**) via Chrome Prompt API zurück.

**Kein Server, kein Backend, kein Datenabfluss!**

---

## ✨ Kern-Features & Härtung

- **100 % Lokal & Offline:** Nutzt die native Prompt API (`window.LanguageModel` und `window.ai.languageModel`). Prompts verlassen niemals dein Endgerät.
- **Zero-Dependency Architektur:** Reines Vanilla JavaScript (ES6+), modernes CSS und HTML5. Keine externen Frameworks (React, Vue), keine Bundler, keine externen CDN-Skripte.
- **Smart Context Compression & Live Token Telemetrie:** Zweistufige Token-Zählung (synchrone Prompt-API Properties `tokensSoFar`/`maxTokens`, asynchrones `countPromptTokens` und Heuristik-Fallback). Direkte Live-Anzeige im Header-Badge (`📊 X / Y Tok`). Bei >65 % Auslastung ermöglicht ein KI-Archivar das verlustfreie Verdichten älterer Gesprächsteile.
- **Multi-Session Storage mit Quota-Guard:** Persistente Speicherung mehrerer Chats direkt im lokalen Browser-Speicher (`LocalStorage`) mit 1,5s Debouncing und präzisem Quota-Überlaufschutz.
- **Isolierte Code-Sandbox mit Ein-/Ausblenden:** Generierter HTML/JS-Code kann mit einem Klick in einem streng isolierten `<iframe>` (`sandbox="allow-scripts"`, ohne `allow-same-origin`) ausgeführt und getestet werden.
- **Kryptografische Token-Sicherheit:** Kollisionsfreie Codeblock-Platzhalter und geschützte Syntax-Hervorhebung verhindern Entity-Mangles oder Code-Injektionen.
- **Datenschutz & Proxy-Steuerung:** Web-URL-Analysen laufen standardmäßig über einen konfigurierbaren CORS-Proxy und können im Persona-/Einstellungsmenü mit einem Klick komplett deaktiviert werden.
- **Sprachsteuerung:** Natives Speech-to-Text (Mikrofon) und intelligentes Text-to-Speech (Vorlesen mit automatischer Sprachauswahl DE/EN).
- **Kontext-Injektion:** Lokale Text- und Code-Dateien (TXT, MD, CSV, JSON, LOG, YAML, JS, HTML) bequem per Drag & Drop in den Prompt einspeisen.
- **Automatisierte Systemdiagnose & Troubleshooting:** Erkennt fehlende Flags, ausstehende Modell-Downloads oder Hardware-Restriktionen (z. B. unter Windows) automatisch und zeigt eine interaktive Schritt-für-Schritt-Anleitung mit One-Click Re-Test direkt im Chat an.
- **Integriertes Debug-Terminal:** Echtzeit-Error-Handling (`window.onerror`, `unhandledrejection`), Hotkey `Strg+D` / `Cmd+D` und Export als `.log`.

---

## 🚀 Installation & Systemanforderungen

Da die native Chrome Built-in AI aktuell als Standard-Web-API finalisiert wird, muss die KI-Engine im Chrome-Browser einmalig aktiviert werden.

### Voraussetzungen
1. **Google Chrome** (aktuelle Version / Canary / Dev).
2. Hardware mit lokaler Modell-Unterstützung (ausreichend RAM und NPU/GPU).

### Setup (Einmalige Freischaltung in Chrome)
1. Öffne einen neuen Tab und navigiere zu:
   `chrome://flags/#prompt-api-for-gemini-nano`
   -> Setze den Wert auf **Enabled**.
2. Navigiere zu:
   `chrome://flags/#optimization-guide-on-device-model`
   -> Setze den Wert auf **Enabled BypassPerfRequirement**.
3. Klicke unten rechts auf **Relaunch**, um den Browser komplett neu zu starten.
4. *(Optional / Diagnose)*: Falls das Modell noch nicht heruntergeladen wurde, navigiere zu `chrome://components`, suche nach **Optimization Guide On Device Model** und klicke auf **Nach Updates suchen**.

---

## 💻 Nutzung

Sobald die Flags aktiviert sind:
1. Repository klonen oder die Datei `index.html` herunterladen:
   ```bash
   git clone https://github.com/Meik1982/LOCAL.git
   ```
2. Öffne die `index.html` (oder den Alias `chat.html`) per Doppelklick in Google Chrome.
3. Die Status-Pille oben zeigt `🟢 Gemini Nano bereit` an – du kannst direkt losschreiben!

---

## ⌨️ Tastaturkürzel (Cross-Platform)

| Tastenkombination (Linux/Windows) | Tastenkombination (macOS) | Aktion |
| :--- | :--- | :--- |
| `Strg + D` | `Cmd + D` | Debug-Terminal ein-/ausblenden |
| `Strg + B` | `Cmd + B` | Seitenleiste (Sessions) umschalten |
| `Strg + L` | `Cmd + L` | Neue Chat-Sitzung erstellen |
| `Strg + S` | `Cmd + S` | Aktuellen Chat exportieren (`.txt`) |
| `Strg + O` | `Cmd + O` | Gespeicherten Chat laden (`.txt`) |
| `Strg + M` | `Cmd + M` | Spracheingabe (Mikrofon) starten/stoppen |
| `Enter` | `Enter` | Nachricht absenden |
| `Shift + Enter` | `Shift + Enter` | Neuer Absatz im Eingabefeld |

---

## 🧪 Qualitätssicherung & Tests

Das Repository enthält eine automatisierte Test-Suite auf Basis des nativen Node.js Test-Runners (keine externen npm-Pakete erforderlich):

```bash
# Mit Node.js direkt ausführen:
npm test

# Oder über das Test-Skript:
./tests/run_tests.sh
```

Geprüft werden:
- XSS-Sanitization im Markdown-Parser
- Struktur-Elemente (Überschriften, Listen, Blockquotes, Inline-Code)
- Syntax-Highlighter Tokenisierung und Entity-Immunität
- Kollisionssicherheit bei Code-Blöcken
- Verlustfreie Serialisierung (Export / Import Roundtrip)
- Kontext-Sliding-Window Budget-Grenzwerte

---

## 📐 Architektur

Detaillierte Informationen zum Datenfluss, der Sliding-Window-Kompression und dem Sicherheitsmodell findest du in der [ARCHITECTURE.md](ARCHITECTURE.md).

---

## 📜 Lizenz

Dieses Projekt steht unter der **MIT-Lizenz**.
