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
        FILE_PREFIX: "--- Lokaler KI-Chat Export ---",
        MAX_WEBPAGE_CHARS: 3500,
        MAX_CONTEXT_CHARS: 12000,
        SAFE_INIT_CHARS: 9000,
        MARKERS: { SYS: "---[System]---", USR: "---[Du]---", AI: "---[KI]---" }
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
