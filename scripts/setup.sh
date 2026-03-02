#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"

echo ""
echo "🌀 Meteor Wormhole — Setup"
echo "══════════════════════════════════════════"
echo ""

# Check for Node.js
if ! command -v node &>/dev/null; then
  echo "❌ Node.js is required. Install it from https://nodejs.org/"
  exit 1
fi
echo "✅ Node.js $(node --version)"

# Check for npm
if ! command -v npm &>/dev/null; then
  echo "❌ npm is required."
  exit 1
fi
echo "✅ npm $(npm --version)"

# Install test client dependencies
echo ""
echo "📦 Installing test-client dependencies..."
cd "$ROOT_DIR/test-client"
npm install
echo "✅ Test client ready"

# Check for Meteor
echo ""
if command -v meteor &>/dev/null; then
  echo "✅ Meteor $(meteor --version) found"
  METEOR_CMD="meteor"
elif npx meteor@latest --version &>/dev/null 2>&1; then
  echo "✅ Meteor available via npx"
  METEOR_CMD="npx meteor@latest"
else
  echo "⚠️  Meteor not found. Installing via npx..."
  METEOR_CMD="npx meteor@latest"
fi

echo ""
echo "══════════════════════════════════════════"
echo "Setup complete! Next steps:"
echo ""
echo "1. Start the test app:"
echo "   cd apps/test-app"
echo "   METEOR_PACKAGE_DIRS=../../packages $METEOR_CMD"
echo ""
echo "2. In another terminal, run the test client:"
echo "   cd test-client"
echo "   node index.mjs          # Interactive demo"
echo "   node index.mjs --test   # Automated tests"
echo ""
echo "3. Run package unit tests:"
echo "   cd apps/test-app"
echo "   METEOR_PACKAGE_DIRS=../../packages $METEOR_CMD test-packages ../../packages/meteor-wormhole/"
echo ""
echo "══════════════════════════════════════════"
