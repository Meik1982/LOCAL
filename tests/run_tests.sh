#!/usr/bin/env bash
set -euo pipefail

echo "=========================================="
echo " Running LOCAL Test & Validation Suite"
echo "=========================================="

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

cd "${ROOT_DIR}"

echo "[1/2] Prüfe JavaScript Syntax in index.html..."
node -e '
const fs = require("fs");
const vm = require("vm");
const html = fs.readFileSync("index.html", "utf8");
const match = html.match(/<script>([\s\S]*?)<\/script>/);
if (!match) { console.error("Kein Script-Tag gefunden!"); process.exit(1); }
new vm.Script(match[1]);
console.log(" -> Syntax einwandfrei.");
'

echo "[2/2] Führe Regressionstests aus..."
node --test tests/test_local.js

echo "=========================================="
echo " Alle Tests erfolgreich abgeschlossen! ✓"
echo "=========================================="
