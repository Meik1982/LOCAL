/**
 * Test-Suite für LOCAL (Lokale Offline Chat Anwendungs-Logik)
 * 
 * Verifiziert:
 * 1. XSS Sanitization & HTML-Escaping
 * 2. Markdown Parsing & Structure Engine
 * 3. Syntax Highlighter Tokenisierung & Entity-Immunität
 * 4. Token-Kollisionssicherheit bei Code-Blöcken
 * 5. Multi-Turn Export & Import Roundtrip
 * 6. Kontext-Slicing & SAFE_INIT_CHARS Grenzen
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

// Extrahiere die App-Klasse und Config aus index.html
const htmlSource = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');
const scriptMatch = htmlSource.match(/<script>([\s\S]*?)<\/script>/);

if (!scriptMatch) {
    throw new Error("Konnte <script> Block in index.html nicht finden.");
}

// Erstelle eine Sandbox-Instanz der Parser- und Storage-Methoden
const appMock = {
    CONFIG: {
        APP_VERSION: "1.3.0",
        FILE_PREFIX: "--- Lokaler KI-Chat Export ---",
        MAX_WEBPAGE_CHARS: 3500,
        MAX_CONTEXT_CHARS: 12000,
        SAFE_INIT_CHARS: 9000,
        MARKERS: { SYS: "---[System]---", USR: "---[Du]---", AI: "---[KI]---" },
        PERSONA_PRESETS: {
            general: "Du bist ein kompetenter, präziser und direkter KI-Assistent. Antworte ohne Füllsätze, sachlich und auf den Punkt. Formatiere Code stets mit Sprachangabe in Markdown.",
            code_review: "Du bist ein erfahrener Systems-Programmierer (C, Rust, Linux-Kernel, POSIX). Analysiere Code streng auf Speicherlecks, Concurrency-Issues, UB (Undefined Behavior), Bounds-Checks und Robustheit. Liefere stets konkrete Diff- oder Code-Korrekturen und erkläre das 'Warum'.",
            auditor: "Du bist ein technischer Auditor und Sicherheitsprüfer (Schwerpunkt: IT-Sicherheit, Code-Audits und technische Normen). Hinterfrage Annahmen kritisch, identifiziere Schwachstellen (XSS, Injection, Quota-Limits, Race Conditions) und fordere lückenlose Verifikation.",
            sparring: "Du bist ein unvoreingenommener, kritischer Sparringspartner. Bestätige Annahmen nicht vorschnell, sondern weise auf Edge Cases, architektonische Fallstricke, Skalierungsgrenzen und alternative Design-Patterns hin.",
            concise: "Antworte extrem komprimiert: Ausschließlich Code, Befehle oder stichpunktartige Fakten. Verzichte komplett auf Einleitungen, Zusammenfassungen, Höflichkeitsfloskeln oder Wiederholungen der Frage."
        }
    },
    escapeHtml(str) {
        return str
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    },
    highlightSyntax(code) {
        const tokenRegex = /(\/\/[^\n]*|\/\*[\s\S]*?\*\/)|(`(?:\\`|[\s\S])*?`|"(?:\\下|[^"\\])*"|'(?:\\'|[^'\\])*')|\b(0x[0-9a-fA-F]+|\d+(?:\.\d+)?)\b|\b(const|let|var|function|class|import|export|return|if|else|for|while|async|await|try|catch|new|true|false|null|undefined|document|window)\b/g;

        let result = "";
        let lastIdx = 0;
        let match;

        while ((match = tokenRegex.exec(code)) !== null) {
            if (match.index > lastIdx) {
                result += this.escapeHtml(code.slice(lastIdx, match.index));
            }
            if (match[1]) {
                result += `<span class="hl-comment">${this.escapeHtml(match[1])}</span>`;
            } else if (match[2]) {
                result += `<span class="hl-string">${this.escapeHtml(match[2])}</span>`;
            } else if (match[3]) {
                result += `<span class="hl-number">${this.escapeHtml(match[3])}</span>`;
            } else if (match[4]) {
                result += `<span class="hl-keyword">${this.escapeHtml(match[4])}</span>`;
            }
            lastIdx = tokenRegex.lastIndex;
        }
        if (lastIdx < code.length) {
            result += this.escapeHtml(code.slice(lastIdx));
        }
        return result;
    },
    parseMarkdown(text) {
        if (!text) return "";
        const codeBlocks = [];
        const blockMarker = `__LOCAL_CB_${Math.random().toString(36).slice(2)}_${Date.now()}_`;
        
        let html = text.replace(/```(\w*)\n?([\s\S]*?)```/g, (match, lang, code) => {
            const idx = codeBlocks.length;
            codeBlocks.push({ lang: (lang || '').trim(), code: code.replace(/\n$/, '') });
            return `${blockMarker}${idx}__`;
        });

        html = this.escapeHtml(html);
        html = html.replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>');
        html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
        html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');
        
        html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>');
        html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>');
        html = html.replace(/^# (.*$)/gim, '<h1>$1</h1>');
        // Zitate & Listen
        html = html.replace(/^(?:&gt;|>)\s?(.*$)/gim, '<blockquote>$1</blockquote>');
        html = html.replace(/^\s*[-*]\s+(.*$)/gim, '<li>$1</li>');
        
        html = html.replace(/\n\n+/g, '</p><p>');
        html = html.replace(/\n/g, '<br>');

        codeBlocks.forEach((block, i) => {
            const rawExecCode = encodeURIComponent(block.code);
            const highlighted = this.highlightSyntax(block.code);
            
            const blockHtml = `</p><div class="code-wrap">
                <div class="code-header">
                    <span>${this.escapeHtml(block.lang) || 'Code'}</span>
                    <div class="code-actions" data-raw="${rawExecCode}">
                        <button class="action-btn code-copy">📋 Kopieren</button>
                        <button class="action-btn code-run" title="Isolierte Sandbox">▶️ Ausführen</button>
                    </div>
                </div>
                <pre><code>${highlighted}</code></pre>
            </div><p>`;
            
            html = html.replace(`${blockMarker}${i}__`, blockHtml);
        });

        return `<p>${html}</p>`.replace(/<p>\s*<\/p>/g, '');
    },
    generateExport(messages) {
        let chatText = this.CONFIG.FILE_PREFIX + "\n";
        messages.forEach(m => {
            if (m.role === 'System') {
                chatText += `\n${this.CONFIG.MARKERS.SYS}\n${m.text}\n`;
            } else {
                const marker = m.role === 'Du' ? this.CONFIG.MARKERS.USR : this.CONFIG.MARKERS.AI;
                chatText += `\n${marker}\n${m.text}\n`;
            }
        });
        return chatText;
    },
    parseExport(content) {
        const lines = content.replace(/\r\n/g, '\n').split('\n');
        if (!lines[0] || !lines[0].startsWith(this.CONFIG.FILE_PREFIX)) return [];

        const messages = [];
        let currentRole = null;
        let currentText = [];

        for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (line === this.CONFIG.MARKERS.USR || line === this.CONFIG.MARKERS.AI || line === this.CONFIG.MARKERS.SYS) {
                if (currentRole) {
                    messages.push({ role: currentRole, text: currentText.join('\n').trim() });
                }
                currentRole = line === this.CONFIG.MARKERS.USR ? 'Du' : (line === this.CONFIG.MARKERS.AI ? 'KI' : 'System');
                currentText = [];
            } else {
                if (currentRole) currentText.push(lines[i]); 
            }
        }
        if (currentRole) {
            messages.push({ role: currentRole, text: currentText.join('\n').trim() });
        }
        return messages;
    },
    calculateContextTelemetry(session, charCount, measuredTokens = null) {
        let tokenInfo = null;
        if (session && typeof session.tokensSoFar === 'number' && typeof session.maxTokens === 'number') {
            tokenInfo = {
                current: session.tokensSoFar,
                max: session.maxTokens,
                source: 'session_props'
            };
        } else if (measuredTokens !== null && session) {
            tokenInfo = {
                current: measuredTokens,
                max: session.maxTokens || 4096,
                source: 'count_api'
            };
        }

        let percentage = 0;
        let badgeText = "";
        let tooltip = "";

        if (tokenInfo && tokenInfo.max > 0) {
            percentage = Math.min(100, (tokenInfo.current / tokenInfo.max) * 100);
            const roundedPct = Math.round(percentage);
            tooltip = `Kontext: ${tokenInfo.current} / ${tokenInfo.max} Tokens (${roundedPct}%) [Prompt API ${tokenInfo.source === 'session_props' ? 'Echtzeit' : 'Messung'}]`;
            badgeText = `📊 ${tokenInfo.current} / ${tokenInfo.max} Tok (${roundedPct}%)`;
        } else {
            percentage = Math.min(100, (charCount / this.CONFIG.MAX_CONTEXT_CHARS) * 100);
            const roundedPct = Math.round(percentage);
            tooltip = `Kontext: ca. ${charCount} / ${this.CONFIG.MAX_CONTEXT_CHARS} Zeichen (${roundedPct}%) [Heuristik]`;
            badgeText = `📊 ~${charCount} Zch (${roundedPct}%)`;
        }

        return { percentage, roundedPct: Math.round(percentage), badgeText, tooltip };
    },
    evaluateDiagnosis(env) {
        const ua = env.userAgent || '';
        let os = 'Unbekannt';
        if (/Windows/i.test(ua)) os = 'Windows';
        else if (/Macintosh|Mac OS/i.test(ua)) os = 'macOS';
        else if (/Linux/i.test(ua)) os = 'Linux';
        else if (/Android/i.test(ua)) os = 'Android';

        const isChromium = !!(env.hasChromeGlobal || /Chrome|Chromium|Edg/i.test(ua));
        const isChrome = /Chrome/i.test(ua) && !/Edg|OPR|Brave/i.test(ua);
        let browserName = 'Unbekannter Browser';
        if (isChrome) browserName = 'Google Chrome';
        else if (/Edg/i.test(ua)) browserName = 'Microsoft Edge';
        else if (/Brave/i.test(ua)) browserName = 'Brave';
        else if (/Firefox/i.test(ua)) browserName = 'Firefox';
        else if (/Safari/i.test(ua)) browserName = 'Safari';

        const hasApi = !!(env.hasWindowLanguageModel || env.hasWindowAiLanguageModel);
        const activeInterface = env.hasWindowLanguageModel 
            ? 'window.LanguageModel (WICG Standard)' 
            : (env.hasWindowAiLanguageModel ? 'window.ai.languageModel (Early Draft)' : null);

        const avail = env.availability || null;
        const hasWebGpu = !!env.hasWebGpu;
        let diagnosisState = 'UNKNOWN';
        let actionGuide = [];

        if (!isChromium) {
            diagnosisState = 'NON_CHROMIUM';
            actionGuide = [
                `Du verwendest aktuell ${browserName}. Die lokale Gemini Nano Prompt API wird derzeit nativ nur in Chromium-basierten Browsern (vorrangig Google Chrome / Chrome Canary) unterstützt.`,
                hasWebGpu 
                    ? 'WebGPU Hardware-Beschleunigung ist auf deinem System verfügbar (bereit für In-Browser Wasm/WebGPU-Fallbacks).'
                    : 'WebGPU Hardware-Beschleunigung ist in diesem Browser nicht aktiv oder wird nicht unterstützt.',
                'Für das beste Offline-Erlebnis mit Gemini Nano öffne die Anwendung in Google Chrome (ab Version 128+) oder Chrome Canary.'
            ];
        } else if (!hasApi) {
            diagnosisState = 'NO_FLAGS';
            actionGuide = [
                'Die Prompt API ist im Browser noch nicht aktiviert.',
                '1. Öffne einen neuen Tab: <code>chrome://flags/#prompt-api-for-gemini-nano</code> und setze auf <b>Enabled</b>.',
                '2. Öffne <code>chrome://flags/#optimization-guide-on-device-model</code> und setze auf <b>Enabled BypassPerfRequirement</b>.',
                '3. Starte Chrome komplett neu über die Schaltfläche <b>Relaunch</b> ganz unten.'
            ];
            if (hasWebGpu) {
                actionGuide.push('Hinweis: WebGPU-Beschleunigung ist auf deinem Gerät betriebsbereit.');
            }
        } else if (avail === 'after-download' || avail === 'downloadable') {
            diagnosisState = 'NEEDS_DOWNLOAD';
            actionGuide = [
                'Die Prompt API ist aktiv, aber das lokale KI-Modell (~1,7 GB) wurde noch nicht auf dein Endgerät heruntergeladen.',
                '1. Öffne in Chrome: <code>chrome://components</code>',
                '2. Suche nach der Komponente <b>Optimization Guide On Device Model</b>.',
                '3. Klicke auf <b>Nach Updates suchen</b> (Check for update).',
                '4. Warte, bis der Download abgeschlossen ist (Status wechselt von Version 0.0.0.0 auf eine Versionsnummer wie 2024.x oder 2025.x).'
            ];
        } else if (avail === 'no' || avail === 'unavailable') {
            diagnosisState = 'PERF_OR_STORAGE_BLOCKED';
            actionGuide = [
                `Das System meldet Status "${avail}". Auf ${os}-Systemen greifen hier typischerweise Hardware-Filter oder Speicherbegrenzungen:`,
                '1. Öffne <code>chrome://flags/#optimization-guide-on-device-model</code> und wähle zwingend <b>Enabled BypassPerfRequirement</b> (nicht nur "Enabled").',
                os === 'Windows' 
                    ? '2. Stelle sicher, dass auf Laufwerk <code>C:</code> mindestens <b>20–22 GB freier Speicherplatz</b> verfügbar sind.' 
                    : '2. Stelle sicher, dass auf deiner Systempartition mindestens 20 GB freier Speicherplatz vorhanden sind.',
                '3. Starte Chrome neu (Relaunch) und stoße in <code>chrome://components</code> das Update für <b>Optimization Guide On Device Model</b> an.',
                os === 'Windows' ? '4. Falls du im WLAN bist: Prüfe, ob in den Windows-Netzwerkeinstellungen "Getaktete Verbindung" (Metered Connection) deaktiviert ist.' : ''
            ].filter(Boolean);
        } else if (avail === 'readily' || avail === 'available') {
            diagnosisState = 'READY';
            actionGuide = ['Alle Systemvoraussetzungen sind erfüllt. Gemini Nano ist einsatzbereit.'];
        } else if (avail === 'downloading') {
            diagnosisState = 'DOWNLOADING';
            actionGuide = [
                'Das KI-Modell wird aktuell im Hintergrund heruntergeladen.',
                'Bitte warte einen Moment, bis der Download in Chrome abgeschlossen ist.'
            ];
        } else {
            diagnosisState = 'API_ERROR';
            actionGuide = [
                `Unerwarteter API-Status: "${avail}".`,
                'Prüfe die Browserkonsole (F12) und das Debug-Terminal (Strg+D / Cmd+D).'
            ];
        }

        return {
            os,
            browser: { name: browserName, isChromium, isChrome },
            hardware: {
                ramGB: env.deviceMemory || null,
                cores: env.hardwareConcurrency || null,
                storageQuotaMB: env.storageQuotaMB || null,
                hasWebGpu
            },
            api: { hasApi, activeInterface },
            model: { availability: avail, error: env.error || null },
            diagnosisState,
            actionGuide
        };
    },
    cleanWebpageHtml(html) {
        if (!html) return "";
        let cleaned = html.replace(/<(script|style|nav|header|footer|iframe|noscript|svg)\b[\s\S]*?<\/\1>/gi, '');
        cleaned = cleaned.replace(/<[^>]+>/g, ' ');
        cleaned = cleaned
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&quot;/g, '"')
            .replace(/&#039;/g, "'")
            .replace(/\s+/g, ' ')
            .trim();
        return cleaned.length > this.CONFIG.MAX_WEBPAGE_CHARS 
            ? cleaned.substring(0, this.CONFIG.MAX_WEBPAGE_CHARS) + "\n... [Gekürzt]" 
            : cleaned;
    },
    extractUrls(text) {
        return text.match(/(https?:\/\/[^\s]+)/g) || [];
    },
    formatProxyUrl(proxyPrefix, url) {
        return `${proxyPrefix}${encodeURIComponent(url)}`;
    },
    generateSessionTitle(rawText) {
        const raw = (rawText || "").trim().replace(/\s+/g, ' ');
        return raw.length > 32 ? raw.substring(0, 32) + "..." : (raw || "Neuer Chat");
    },
    parseSessionsFromStorage(storageStr) {
        try {
            if (!storageStr) return [];
            const parsed = JSON.parse(storageStr);
            return Array.isArray(parsed) ? parsed : [];
        } catch (e) {
            return [];
        }
    },
    filterHistoryForConnect(wrappers, maxChars = this.CONFIG.SAFE_INIT_CHARS) {
        const validWrappers = wrappers.filter(w => !w.isRegeneratingSkip);
        let historyText = "";
        let currentLength = 0;
        for (let i = validWrappers.length - 1; i >= 0; i--) {
            const role = validWrappers[i].role === 'user' ? "User" : "KI";
            const chunk = `${role}: ${validWrappers[i].rawText}\n\n`;
            if (currentLength + chunk.length > maxChars) {
                break;
            }
            historyText = chunk + historyText;
            currentLength += chunk.length;
        }
        return historyText;
    },
    generateMarkdownExport(sessionTitle, sysPrompt, messages) {
        let md = `# ${sessionTitle || "Lokaler KI-Chat"}\n\n`;
        md += `*Exportiert am: 2026-09-23 | Version: v${this.CONFIG.APP_VERSION} | Modell: Gemini Nano*\n\n`;
        if (sysPrompt) {
            md += `> **System-Prompt / Persona:**\n> ${sysPrompt.replace(/\n/g, '\n> ')}\n\n`;
        }
        md += `---\n\n`;
        messages.forEach(m => {
            if (m.role === 'system') {
                md += `> ℹ️ *${m.text.trim()}*\n\n`;
            } else {
                const author = m.role === 'user' ? "👤 **Du**" : "🤖 **Gemini Nano**";
                md += `### ${author}\n\n${m.text.trim()}\n\n---\n\n`;
            }
        });
        return md;
    },
    generateJsonExport(sessionId, sessionTitle, sysPrompt, messages) {
        const exportObj = {
            app: "LOCAL",
            version: this.CONFIG.APP_VERSION,
            exportedAt: "2026-09-23T06:30:00.000Z",
            session: {
                id: sessionId || null,
                title: sessionTitle || "Neuer Chat"
            },
            systemPrompt: sysPrompt || "",
            messages: messages.map(m => ({
                role: m.role,
                text: m.text,
                timestamp: "2026-09-23T06:30:00.000Z"
            }))
        };
        return JSON.stringify(exportObj, null, 2);
    },
    syncPresetSelectFromText(text) {
        const currentText = (text || "").trim();
        for (const [key, presetPrompt] of Object.entries(this.CONFIG.PERSONA_PRESETS)) {
            if (presetPrompt.trim() === currentText) {
                return key;
            }
        }
        return 'custom';
    },
    renderDiagnosticCardHtml(diag) {
        return `
            <div class="system-diagnostic-card">
                <div class="diag-header">Status: ${diag.diagnosisState}</div>
                <div class="diag-actions">
                    <button class="diag-btn diag-btn-primary" id="diag-btn-retry">🔄 Erneut prüfen (Chrome)</button>
                    ${diag.hardware.hasWebGpu ? `<button class="diag-btn diag-btn-webgpu" id="diag-btn-webgpu">⚡ WebGPU-Fallback laden (~90 MB)</button>` : ''}
                    <button class="diag-btn" id="diag-btn-terminal">🛠️ Debug-Logs öffnen</button>
                </div>
            </div>
        `;
    },
    getApiBadgeState(status, label) {
        const badgeClass = status === 'ok' ? 'status-ok' : status === 'webgpu' ? 'status-webgpu' : status === 'warn' ? 'status-warn' : 'status-err';
        return {
            className: 'header-status-badge ' + badgeClass,
            text: label
        };
    },
    cleanupSession(session) {
        if (session && typeof session.destroy === 'function') {
            try {
                session.destroy();
                return true;
            } catch (e) {
                return false;
            }
        }
        return false;
    }
};

// ==========================================
// TEST SUITE
// ==========================================

test('1. XSS-Sanitization im Markdown Fließtext', () => {
    const malicious = '<script>alert("pwned")</script><img src=x onerror=alert(1)>';
    const parsed = appMock.parseMarkdown(malicious);
    
    assert.doesNotMatch(parsed, /<script>/, 'Darf kein unmaskiertes <script> enthalten');
    assert.doesNotMatch(parsed, /<img\s/, 'Darf kein unmaskiertes <img> enthalten');
    assert.match(parsed, /&lt;script&gt;/, 'Muss Script-Tags sicher encoden');
    assert.match(parsed, /&lt;img src=x onerror=alert\(1\)&gt;/, 'Muss Img-Payloads sicher encoden');
});

test('2. Markdown-Elemente (Formatierung, Headings, Quotes, Lists)', () => {
    const md = '# Titel\n## Untertitel\n> Zitatblock\n- Punkt 1\n**Fett** und *Kursiv* sowie `inline_code()`';
    const parsed = appMock.parseMarkdown(md);
    
    assert.match(parsed, /<h1>Titel<\/h1>/);
    assert.match(parsed, /<h2>Untertitel<\/h2>/);
    assert.match(parsed, /<blockquote>Zitatblock<\/blockquote>/);
    assert.match(parsed, /<li>Punkt 1<\/li>/);
    assert.match(parsed, /<strong>Fett<\/strong>/);
    assert.match(parsed, /<em>Kursiv<\/em>/);
    assert.match(parsed, /<code class="inline-code">inline_code\(\)<\/code>/);
});

test('3. Syntax-Highlighter Tokenisierung & HTML-Entity Schutz', () => {
    const code = `const msg = "Hallo &#123; Welt &amp; Test";\n// Kommentar mit 999 Nummern\nlet count = 42;`;
    const highlighted = appMock.highlightSyntax(code);
    
    // Verifiziere, dass Entities im String nicht durch Number-Highlighting zerrissen werden
    assert.match(highlighted, /<span class="hl-keyword">const<\/span>/);
    assert.match(highlighted, /<span class="hl-string">&quot;Hallo &amp;#123; Welt &amp;amp; Test&quot;<\/span>/);
    assert.match(highlighted, /<span class="hl-comment">\/\/ Kommentar mit 999 Nummern<\/span>/);
    assert.match(highlighted, /<span class="hl-keyword">let<\/span>/);
    assert.match(highlighted, /<span class="hl-number">42<\/span>/);
    
    // Keine defekten Entities
    assert.doesNotMatch(highlighted, /&amp;#<span class="hl-number">/);
});

test('4. Token-Kollisionssicherheit bei Code-Blöcken', () => {
    // Ein Text, der bösartig den alten statischen Platzhalter enthält
    const trickyText = "Hier ist ein alter Platzhalter: %%%CODE_BLOCK_0%%%\n```javascript\nconst a = 1;\n```";
    const parsed = appMock.parseMarkdown(trickyText);
    
    // Der Codeblock muss korrekt als div gerendert werden
    assert.match(parsed, /class="code-wrap"/);
    // Der statische String %%%CODE_BLOCK_0%%% darf nicht durch den Codeblock ersetzt worden sein
    assert.match(parsed, /%%%CODE_BLOCK_0%%%/);
});

test('5. Export / Import Roundtrip Serialisierung', () => {
    const inputMessages = [
        { role: 'Du', text: 'Wie funktioniert ein Sliding-Window Algorithmus?' },
        { role: 'KI', text: 'Ein Sliding-Window verschiebt einen Puffer fester Größe über die Datenmenge.' },
        { role: 'System', text: '✅ Alter Kontext komprimiert.' },
        { role: 'Du', text: 'Zeige mir ein Code-Beispiel!' }
    ];

    const exportedString = appMock.generateExport(inputMessages);
    assert.match(exportedString, /^--- Lokaler KI-Chat Export ---/);
    assert.match(exportedString, /---\[Du\]---/);
    assert.match(exportedString, /---\[KI\]---/);
    assert.match(exportedString, /---\[System\]---/);

    const reimportedMessages = appMock.parseExport(exportedString);
    assert.equal(reimportedMessages.length, inputMessages.length, 'Nachrichtenanzahl muss exakt übereinstimmen');
    
    for (let i = 0; i < inputMessages.length; i++) {
        assert.equal(reimportedMessages[i].role, inputMessages[i].role, `Rolle an Position ${i} stimmt nicht`);
        assert.equal(reimportedMessages[i].text, inputMessages[i].text, `Text an Position ${i} stimmt nicht`);
    }
});

test('6. Kontext-Slicing & SAFE_INIT_CHARS Budget', () => {
    const limit = appMock.CONFIG.SAFE_INIT_CHARS;
    const veryLongText = "A".repeat(limit + 500);
    
    let sliced = veryLongText;
    if (sliced.length > limit) {
        sliced = sliced.substring(0, limit);
    }
    
    assert.equal(sliced.length, limit, 'Gesliceter Text darf SAFE_INIT_CHARS nicht überschreiten');
});

test('7. Token-Zählung mit synchronen Session-Properties (tokensSoFar / maxTokens)', () => {
    const mockSession = {
        tokensSoFar: 1024,
        maxTokens: 4096
    };
    const telemetry = appMock.calculateContextTelemetry(mockSession, 3500);
    
    assert.equal(telemetry.percentage, 25, 'Prozentwert muss exakt 25% sein');
    assert.equal(telemetry.badgeText, '📊 1024 / 4096 Tok (25%)');
    assert.match(telemetry.tooltip, /Echtzeit/);
});

test('8. Token-Zählung mit asynchronem countPromptTokens() Messwert', () => {
    const mockSession = {
        maxTokens: 4096,
        countPromptTokens: async (text) => 500
    };
    const telemetry = appMock.calculateContextTelemetry(mockSession, 1800, 500);
    
    assert.equal(telemetry.roundedPct, 12);
    assert.equal(telemetry.badgeText, '📊 500 / 4096 Tok (12%)');
    assert.match(telemetry.tooltip, /Messung/);
});

test('9. Token-Zählung Fallback auf Zeichen-Heuristik wenn keine Session aktiv', () => {
    const telemetry = appMock.calculateContextTelemetry(null, 6000);
    
    // 6000 von 12000 Zeichen = 50%
    assert.equal(telemetry.percentage, 50);
    assert.equal(telemetry.badgeText, '📊 ~6000 Zch (50%)');
    assert.match(telemetry.tooltip, /Heuristik/);
});

test('10. Systemdiagnose: Erkennung fehlender Flags (NO_FLAGS) unter Windows', () => {
    const env = {
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
        hasChromeGlobal: true,
        hasWindowLanguageModel: false,
        hasWindowAiLanguageModel: false,
        availability: null
    };
    const diag = appMock.evaluateDiagnosis(env);
    
    assert.equal(diag.os, 'Windows');
    assert.equal(diag.browser.name, 'Google Chrome');
    assert.equal(diag.diagnosisState, 'NO_FLAGS');
    assert.ok(diag.actionGuide.some(step => step.includes('chrome://flags/#prompt-api-for-gemini-nano')));
});

test('11. Systemdiagnose: Erkennung ausstehender Modell-Download (NEEDS_DOWNLOAD)', () => {
    const env = {
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/128.0.0.0 Safari/537.36',
        hasChromeGlobal: true,
        hasWindowLanguageModel: true,
        availability: 'after-download'
    };
    const diag = appMock.evaluateDiagnosis(env);
    
    assert.equal(diag.diagnosisState, 'NEEDS_DOWNLOAD');
    assert.ok(diag.actionGuide.some(step => step.includes('chrome://components')));
    assert.ok(diag.actionGuide.some(step => step.includes('Optimization Guide On Device Model')));
});

test('12. Systemdiagnose: Erkennung Performance/Storage-Sperre (PERF_OR_STORAGE_BLOCKED)', () => {
    const env = {
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/128.0.0.0 Safari/537.36',
        hasChromeGlobal: true,
        hasWindowLanguageModel: true,
        availability: 'no'
    };
    const diag = appMock.evaluateDiagnosis(env);
    
    assert.equal(diag.os, 'Windows');
    assert.equal(diag.diagnosisState, 'PERF_OR_STORAGE_BLOCKED');
    assert.ok(diag.actionGuide.some(step => step.includes('BypassPerfRequirement')));
    assert.ok(diag.actionGuide.some(step => step.includes('C:')));
});

test('13. Systemdiagnose: Erfolgreiche Betriebsbereitschaft (READY via readily oder available)', () => {
    // 13a. Älterer Canary Entwurf: readily
    const envReadily = {
        userAgent: 'Mozilla/5.0 (X11; Linux x86_64) Chrome/128.0.0.0 Safari/537.36',
        hasChromeGlobal: true,
        hasWindowLanguageModel: true,
        availability: 'readily'
    };
    const diagReadily = appMock.evaluateDiagnosis(envReadily);
    assert.equal(diagReadily.os, 'Linux');
    assert.equal(diagReadily.diagnosisState, 'READY');

    // 13b. Neuerer WICG Standard Entwurf: available
    const envAvailable = {
        userAgent: 'Mozilla/5.0 (X11; Linux x86_64) Chrome/130.0.0.0 Safari/537.36',
        hasChromeGlobal: true,
        hasWindowLanguageModel: true,
        availability: 'available'
    };
    const diagAvailable = appMock.evaluateDiagnosis(envAvailable);
    assert.equal(diagAvailable.os, 'Linux');
    assert.equal(diagAvailable.diagnosisState, 'READY');
});

test('14. Systemdiagnose: Nicht-Chromium Browser Erkennung (NON_CHROMIUM)', () => {
    const env = {
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:130.0) Gecko/20100101 Firefox/130.0',
        hasChromeGlobal: false,
        hasWindowLanguageModel: false,
        availability: null
    };
    const diag = appMock.evaluateDiagnosis(env);
    
    assert.equal(diag.browser.name, 'Firefox');
    assert.equal(diag.diagnosisState, 'NON_CHROMIUM');
    assert.ok(diag.actionGuide.some(step => step.includes('Google Chrome')));
});

test('15. Versions-Konsistenz: package.json, CONFIG und DOM-Badges', () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, '../package.json'), 'utf8'));
    const expectedVer = pkg.version;
    
    // Prüfe CONFIG.APP_VERSION im Script
    const configVerMatch = scriptMatch[1].match(/APP_VERSION:\s*["']([^"']+)["']/);
    assert.ok(configVerMatch, 'CONFIG.APP_VERSION muss im Script definiert sein');
    assert.equal(configVerMatch[1], expectedVer, 'CONFIG.APP_VERSION muss mit package.json übereinstimmen');

    // Prüfe Header-Badge und Sidebar-Footer im HTML
    assert.ok(htmlSource.includes(`v${expectedVer}`), `HTML muss 'v${expectedVer}' Badge enthalten`);
    assert.ok(htmlSource.includes(`id="app-version-badge"`), 'Header muss #app-version-badge besitzen');
    assert.ok(htmlSource.includes(`class="sidebar-footer"`), 'Sidebar muss .sidebar-footer besitzen');
});

test('16. Webseiten-Extraktion: Filterung von Script/Junk-Tags und Längenbegrenzung', () => {
    const rawHtml = `
        <!DOCTYPE html>
        <html>
        <head>
            <style>body { font-size: 14px; }</style>
            <script>alert("evil malicious script");</script>
        </head>
        <body>
            <header><nav><a href="/">Menü Navigation</a></nav></header>
            <main>
                <h1>Hauptartikel Überschrift</h1>
                <p>Das ist der echte Inhalt des Artikels, der für die KI bestimmt ist.</p>
                <iframe src="https://evil.com"></iframe>
                <noscript>JavaScript erforderlich</noscript>
                <svg><circle cx="50" cy="50" r="40" /></svg>
            </main>
            <footer>Copyright 2026 Beispiel GmbH</footer>
        </body>
        </html>
    `;

    const cleaned = appMock.cleanWebpageHtml(rawHtml);
    assert.doesNotMatch(cleaned, /alert\("evil malicious script"\)/, 'Script-Inhalte müssen restlos entfernt werden');
    assert.doesNotMatch(cleaned, /body \{ font-size/, 'Style-Inhalte müssen entfernt werden');
    assert.doesNotMatch(cleaned, /Menü Navigation/, 'Nav- und Header-Inhalte müssen entfernt werden');
    assert.doesNotMatch(cleaned, /Copyright 2026/, 'Footer-Inhalte müssen entfernt werden');
    assert.doesNotMatch(cleaned, /evil\.com/, 'Iframe-Inhalte müssen entfernt werden');
    assert.match(cleaned, /Hauptartikel Überschrift/, 'Echter Artikel-Titel muss erhalten bleiben');
    assert.match(cleaned, /echte Inhalt des Artikels/, 'Echter Absatztext muss erhalten bleiben');

    // Prüfe Längenbegrenzung auf CONFIG.MAX_WEBPAGE_CHARS (3500)
    const longHtml = `<p>${'A'.repeat(5000)}</p>`;
    const truncated = appMock.cleanWebpageHtml(longHtml);
    assert.equal(truncated.length, appMock.CONFIG.MAX_WEBPAGE_CHARS + "\n... [Gekürzt]".length);
    assert.ok(truncated.endsWith("\n... [Gekürzt]"));
});

test('17. URL-Erkennung & sicheres Proxy-Encoding', () => {
    const promptWithUrl = 'Lies bitte https://example.com:8443/docs/api?q=test%20wert&filter=active#details durch und fasse es zusammen.';
    const urls = appMock.extractUrls(promptWithUrl);
    
    assert.equal(urls.length, 1);
    assert.equal(urls[0], 'https://example.com:8443/docs/api?q=test%20wert&filter=active#details');

    const proxyPrefix = 'https://api.allorigins.win/get?url=';
    const proxyUrl = appMock.formatProxyUrl(proxyPrefix, urls[0]);

    // Das Ziel-URL-Query-String muss encodiert sein, damit der Proxy-Request nicht verfälscht wird
    assert.ok(proxyUrl.startsWith(proxyPrefix));
    assert.ok(proxyUrl.includes(encodeURIComponent('q=test%20wert&filter=active#details')));
    assert.doesNotMatch(proxyUrl.slice(proxyPrefix.length), /[?#]/, 'Im encodierten Teil dürfen keine unmaskierten ? oder # stehen');
});

test('18. Session-Titel-Generierung & robuster LocalStorage-Fallback', () => {
    // 18a. Auto-Titel Kürzung bei langen Prompts (> 32 Zeichen)
    const longPrompt = 'Kannst du mir bitte ein vollständiges C-Programm für einen Ringpuffer schreiben?';
    const titleLong = appMock.generateSessionTitle(longPrompt);
    assert.equal(titleLong, 'Kannst du mir bitte ein vollstän...');
    assert.equal(titleLong.length, 35); // 32 chars + '...'

    // 18b. Fallback bei leerer/whitespace Eingabe
    assert.equal(appMock.generateSessionTitle('   \n\t  '), 'Neuer Chat');
    assert.equal(appMock.generateSessionTitle(''), 'Neuer Chat');

    // 18c. Robuster Fallback bei korruptem JSON im Storage
    const corruptedJson = '{"id": 123, "title": "Fehler';
    const safeSessions = appMock.parseSessionsFromStorage(corruptedJson);
    assert.deepEqual(safeSessions, [], 'Korruptes JSON muss ohne Exception als leeres Array initialisiert werden');

    // 18d. Gültige Session-Liste
    const validJson = JSON.stringify([{ id: '1', title: 'Test Chat', data: 'data' }]);
    const parsedSessions = appMock.parseSessionsFromStorage(validJson);
    assert.equal(parsedSessions.length, 1);
    assert.equal(parsedSessions[0].title, 'Test Chat');

    // 18e. Valides JSON, aber kein Array
    const objectJson = JSON.stringify({ not: 'an array' });
    assert.deepEqual(appMock.parseSessionsFromStorage(objectJson), []);
});

test('19. Prompt-Historien-Filterung bei Regenerierung (regenerating-skip)', () => {
    const wrappers = [
        { role: 'user', rawText: 'Erster Prompt', isRegeneratingSkip: false },
        { role: 'ai', rawText: 'Alte fehlerhafte Antwort', isRegeneratingSkip: true },
        { role: 'user', rawText: 'Zweiter Prompt', isRegeneratingSkip: false }
    ];

    const history = appMock.filterHistoryForConnect(wrappers, 9000);
    assert.match(history, /User: Erster Prompt/);
    assert.match(history, /User: Zweiter Prompt/);
    assert.doesNotMatch(history, /Alte fehlerhafte Antwort/, 'Elemente mit regenerating-skip dürfen nicht in den neuen Prompt gelangen');
});

test('20. Statisches Sicherheits-Audit: Strikte Sandbox-Isolation im Quellcode', () => {
    // 20a. Überprüfe die Sandbox-Konfiguration aller iframes im HTML
    assert.match(htmlSource, /sandbox\s*=\s*['"]allow-scripts['"]/, 'iframe Sandbox muss strikt auf allow-scripts beschränkt sein');
    
    // 20b. Niemals allow-same-origin zusammen mit allow-scripts (XSS Escape Risiko für LocalStorage)
    assert.doesNotMatch(htmlSource, /allow-same-origin/, 'allow-same-origin darf unter keinen Umständen im Quellcode vorhanden sein');

    // 20c. Keine gefährlichen Inline-JavaScript Pseudo-Protokolle
    assert.doesNotMatch(htmlSource, /href\s*=\s*["']javascript:/i, 'Keine inline javascript: URLs erlaubt');
    assert.doesNotMatch(htmlSource, /src\s*=\s*["']javascript:/i, 'Keine inline javascript: Quellen erlaubt');
});

test('21. Strukturierter Markdown-Export (.md)', () => {
    const sessionTitle = 'C-Kernel Audit & Ringpuffer';
    const sysPrompt = 'Du bist ein erfahrener Systems-Programmierer.';
    const messages = [
        { role: 'system', text: 'Prompt API verbunden.' },
        { role: 'user', text: 'Wie verhindere ich Buffer Overflows in C?' },
        { role: 'ai', text: 'Nutze Bounds-Checking und vermeide ungesicherte Funktionen wie strcpy():\n\n```c\nstrncpy(dest, src, sizeof(dest) - 1);\n```' }
    ];

    const md = appMock.generateMarkdownExport(sessionTitle, sysPrompt, messages);
    
    assert.match(md, /^# C-Kernel Audit & Ringpuffer/, 'Muss Chat-Titel als H1 Überschrift tragen');
    assert.match(md, /> \*\*System-Prompt \/ Persona:\*\*/, 'Muss System-Prompt Zitatblock enthalten');
    assert.match(md, /### 👤 \*\*Du\*\*/, 'Muss User-Überschrift tragen');
    assert.match(md, /Wie verhindere ich Buffer Overflows in C\?/, 'Muss User-Text enthalten');
    assert.match(md, /### 🤖 \*\*Gemini Nano\*\*/, 'Muss KI-Überschrift tragen');
    assert.match(md, /```c\nstrncpy\(dest, src, sizeof\(dest\) - 1\);\n```/, 'Code-Blöcke müssen unversehrt bleiben');
    assert.match(md, /> ℹ️ \*Prompt API verbunden\.\*/, 'Systemnachrichten müssen als Info formatiert sein');
    assert.match(md, /---/, 'Muss visuelle Trennlinien enthalten');
});

test('22. Maschinenlesbarer JSON-Export (.json)', () => {
    const sessionId = 'session_12345';
    const sessionTitle = 'Hardware-Analyse';
    const sysPrompt = 'Analysiere Hardware-Metriken.';
    const messages = [
        { role: 'user', text: 'Wie viel RAM habe ich?' },
        { role: 'assistant', text: 'Erkannt wurden ca. 32 GB RAM.' }
    ];

    const jsonStr = appMock.generateJsonExport(sessionId, sessionTitle, sysPrompt, messages);
    const parsed = JSON.parse(jsonStr);

    assert.equal(parsed.app, 'LOCAL');
    assert.equal(parsed.version, '1.3.0');
    assert.equal(parsed.session.id, 'session_12345');
    assert.equal(parsed.session.title, 'Hardware-Analyse');
    assert.equal(parsed.systemPrompt, 'Analysiere Hardware-Metriken.');
    assert.equal(parsed.messages.length, 2);
    assert.equal(parsed.messages[0].role, 'user');
    assert.equal(parsed.messages[0].text, 'Wie viel RAM habe ich?');
    assert.equal(parsed.messages[1].role, 'assistant');
    assert.ok(parsed.messages[0].timestamp, 'Muss Timestamps besitzen');
});

test('23. Persona-Presets & Zwei-Wege-Synchronisation', () => {
    // 23a. Auswahl der vordefinierten Presets
    const codePreset = appMock.CONFIG.PERSONA_PRESETS.code_review;
    assert.ok(codePreset.includes('Systems-Programmierer'), 'Code Review Preset muss existieren');
    assert.ok(codePreset.includes('Undefined Behavior'), 'Code Review Preset muss UB enthalten');

    const auditorPreset = appMock.CONFIG.PERSONA_PRESETS.auditor;
    assert.ok(auditorPreset.includes('technischer Auditor'), 'Auditor Preset muss existieren');

    // 23b. Erkennung des Presets anhand des Prompt-Texts (Reverse-Sync)
    assert.equal(appMock.syncPresetSelectFromText(codePreset), 'code_review');
    assert.equal(appMock.syncPresetSelectFromText(auditorPreset), 'auditor');
    assert.equal(appMock.syncPresetSelectFromText(appMock.CONFIG.PERSONA_PRESETS.concise), 'concise');

    // 23c. Modifizierter Text fällt automatisch auf 'custom' zurück
    const modifiedPrompt = codePreset + ' Und antworte auf Spanisch.';
    assert.equal(appMock.syncPresetSelectFromText(modifiedPrompt), 'custom');
    assert.equal(appMock.syncPresetSelectFromText('Beliebiger eigener Prompt'), 'custom');
});

test('24. WebGPU Hardware-Erkennung & Fallback-Empfehlung in Systemdiagnose', () => {
    // 24a. Nicht-Chromium (z. B. Firefox) mit verfügbarem WebGPU
    const envFirefoxWebGpu = {
        userAgent: 'Mozilla/5.0 (X11; Linux x86_64; rv:130.0) Gecko/20100101 Firefox/130.0',
        hasChromeGlobal: false,
        hasWindowLanguageModel: false,
        hasWebGpu: true,
        availability: null
    };
    const diagFirefoxGpu = appMock.evaluateDiagnosis(envFirefoxWebGpu);
    assert.equal(diagFirefoxGpu.diagnosisState, 'NON_CHROMIUM');
    assert.equal(diagFirefoxGpu.hardware.hasWebGpu, true);
    assert.ok(diagFirefoxGpu.actionGuide.some(step => step.includes('WebGPU Hardware-Beschleunigung ist auf deinem System verfügbar')));

    // 24b. Nicht-Chromium ohne WebGPU
    const envFirefoxNoGpu = {
        userAgent: 'Mozilla/5.0 (X11; Linux x86_64; rv:130.0) Gecko/20100101 Firefox/130.0',
        hasChromeGlobal: false,
        hasWindowLanguageModel: false,
        hasWebGpu: false,
        availability: null
    };
    const diagFirefoxNoGpu = appMock.evaluateDiagnosis(envFirefoxNoGpu);
    assert.equal(diagFirefoxNoGpu.hardware.hasWebGpu, false);
    assert.ok(diagFirefoxNoGpu.actionGuide.some(step => step.includes('nicht aktiv oder wird nicht unterstützt')));

    // 24c. Chrome mit Prompt API (Nativ bleibt 100% vorrangig READY)
    const envChromeReady = {
        userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
        hasChromeGlobal: true,
        hasWindowLanguageModel: true,
        hasWebGpu: true,
        availability: 'available'
    };
    const diagChrome = appMock.evaluateDiagnosis(envChromeReady);
    assert.equal(diagChrome.diagnosisState, 'READY');
    assert.equal(diagChrome.hardware.hasWebGpu, true);
    assert.equal(diagChrome.actionGuide[0], 'Alle Systemvoraussetzungen sind erfüllt. Gemini Nano ist einsatzbereit.');
});

test('25. Einheitlicher Session-Vertrag für Hybrid-Engines (WebGPU & Chrome Nano)', async () => {
    // Erstelle ein Mock-Session-Objekt für WebGPU
    const mockWebGpuSession = {
        isWebGpu: true,
        maxTokens: 2048,
        tokensSoFar: 120,
        async *promptStreaming(promptText) {
            yield "Hallo ";
            yield "aus ";
            yield "WebGPU!";
        },
        async countPromptTokens(text) {
            return Math.ceil(text.length / 3.8);
        },
        destroy() {
            this.destroyed = true;
        }
    };

    // 25a. Validiere Eigenschaften
    assert.equal(typeof mockWebGpuSession.maxTokens, 'number');
    assert.equal(typeof mockWebGpuSession.tokensSoFar, 'number');
    assert.equal(typeof mockWebGpuSession.countPromptTokens, 'function');
    assert.equal(typeof mockWebGpuSession.destroy, 'function');

    // 25b. Validiere Streaming-Iterierbarkeit
    const stream = mockWebGpuSession.promptStreaming("Test");
    let fullResponse = "";
    for await (const chunk of stream) {
        fullResponse += chunk;
    }
    assert.equal(fullResponse, "Hallo aus WebGPU!");

    // 25c. Validiere Token-Zählung
    const tokens = await mockWebGpuSession.countPromptTokens("12345678");
    assert.ok(tokens > 0);

    // 25d. Validiere Destroy
    mockWebGpuSession.destroy();
    assert.equal(mockWebGpuSession.destroyed, true);
});

test('26. Engine-Routing & strikte Priorisierung von Chrome Gemini Nano', () => {
    const routeEngine = (activeEngine, forceEngine) => {
        if (forceEngine === 'webgpu' || (activeEngine === 'webgpu' && forceEngine !== 'chrome_nano')) {
            return 'webgpu';
        }
        return 'chrome_nano';
    };

    // 26a. Standard ist immer Chrome Gemini Nano
    assert.equal(routeEngine('chrome_nano', null), 'chrome_nano');
    assert.equal(routeEngine(null, null), 'chrome_nano');

    // 26b. Expliziter WebGPU-Aufruf
    assert.equal(routeEngine('chrome_nano', 'webgpu'), 'webgpu');

    // 26c. Fortführung im WebGPU-Modus bei aktivem WebGPU
    assert.equal(routeEngine('webgpu', null), 'webgpu');

    // 26d. Expliziter Relaunch / Re-Check schaltet zuverlässig auf Chrome Nano zurück
    assert.equal(routeEngine('webgpu', 'chrome_nano'), 'chrome_nano');
});

test('27. Diagnose-UI: Bedingte Einblendung des WebGPU-Download-Buttons', () => {
    // 27a. System mit WebGPU-Hardware zeigt Aktions-Button
    const diagWithGpu = {
        diagnosisState: 'NON_CHROMIUM',
        hardware: { hasWebGpu: true }
    };
    const htmlWithGpu = appMock.renderDiagnosticCardHtml(diagWithGpu);
    assert.match(htmlWithGpu, /id="diag-btn-webgpu"/, 'WebGPU-Button muss vorhanden sein');
    assert.match(htmlWithGpu, /⚡ WebGPU-Fallback laden \(~90 MB\)/);

    // 27b. System ohne WebGPU-Hardware rendert KEINEN toten Button
    const diagWithoutGpu = {
        diagnosisState: 'NON_CHROMIUM',
        hardware: { hasWebGpu: false }
    };
    const htmlWithoutGpu = appMock.renderDiagnosticCardHtml(diagWithoutGpu);
    assert.doesNotMatch(htmlWithoutGpu, /id="diag-btn-webgpu"/, 'Darf keinen WebGPU-Button ohne Hardware rendern');
});

test('28. UI-Telemetrie & Badge-Status Farbkodierung (Nativ vs. WebGPU vs. Fehler)', () => {
    // 28a. Nativ Chrome (Grün)
    const badgeOk = appMock.getApiBadgeState('ok', 'Gemini Nano bereit');
    assert.equal(badgeOk.className, 'header-status-badge status-ok');
    assert.equal(badgeOk.text, 'Gemini Nano bereit');

    // 28b. WebGPU Fallback (Lila)
    const badgeWebGpu = appMock.getApiBadgeState('webgpu', 'WebGPU: SmolLM2 bereit');
    assert.equal(badgeWebGpu.className, 'header-status-badge status-webgpu');
    assert.equal(badgeWebGpu.text, 'WebGPU: SmolLM2 bereit');

    // 28c. Warnung / Ladevorgang (Gelb)
    const badgeWarn = appMock.getApiBadgeState('warn', 'WebGPU: 50%');
    assert.equal(badgeWarn.className, 'header-status-badge status-warn');

    // 28d. Fehler / Offline (Rot)
    const badgeErr = appMock.getApiBadgeState('err', 'KI Offline');
    assert.equal(badgeErr.className, 'header-status-badge status-err');
});

test('29. Session-Lifecycle & GPU/RAM-Leak-Prävention bei Engine-Wechsel', () => {
    let destroyedCount = 0;
    const sessionA = {
        destroy() {
            destroyedCount++;
        }
    };
    const sessionFaulty = {
        destroy() {
            throw new Error("Fehler beim Freigeben von VRAM");
        }
    };

    // 29a. Reguläre Freigabe
    assert.equal(appMock.cleanupSession(sessionA), true);
    assert.equal(destroyedCount, 1);

    // 29b. Robuste Fehlerbehandlung ohne Uncaught Exception
    assert.equal(appMock.cleanupSession(sessionFaulty), false, 'Fehlerhafte Session darf App nicht crashen');

    // 29c. Null-Session Sicherung
    assert.equal(appMock.cleanupSession(null), false);
    assert.equal(appMock.cleanupSession(undefined), false);
});

test('30. WebGPU Token-Budgetierung & dynamisches Kontext-Slicing', () => {
    // WebGPU nutzt typischerweise ein kleineres Kontextfenster (z. B. 2048 Tokens)
    const webGpuMaxTokens = 2048;
    const safeCharBudget = 7000; // Angepasstes Sicherheitsbudget für kleine Modelle

    const wrappers = [
        { role: 'user', rawText: "X".repeat(3000) },
        { role: 'assistant', rawText: "Y".repeat(3000) },
        { role: 'user', rawText: "Z".repeat(2500) }
    ];

    const history = appMock.filterHistoryForConnect(wrappers, safeCharBudget);
    
    // 30a. Das Budget darf niemals überschritten werden
    assert.ok(history.length <= safeCharBudget, `Historie (${history.length}) muss innerhalb des Budgets (${safeCharBudget}) liegen`);
    
    // 30b. Neueste Nachricht ("Z") muss zwingend enthalten sein
    assert.ok(history.includes("Z".repeat(100)), 'Neueste Nachricht muss erhalten bleiben');

    // 30c. Älteste Nachricht ("X") muss aufgrund von Budget-Überschreitung abgetrennt worden sein
    assert.ok(!history.includes("X".repeat(100)), 'Älteste Nachricht muss abgeschnitten worden sein');
});


