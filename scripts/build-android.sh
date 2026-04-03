#!/bin/bash
set -e

# Android AAB Build Script for Flight Notes AI
# Builds a signed release AAB for Play Store upload

APP_JSON="app.json"

# Read current values
CURRENT_VERSION=$(node -p "require('./$APP_JSON').expo.version")
CURRENT_VERSION_CODE=$(node -p "require('./$APP_JSON').expo.android.versionCode")

echo "========================================="
echo "  Flight Notes AI - Android Build"
echo "========================================="
echo ""
echo "Current version:      $CURRENT_VERSION"
echo "Current versionCode:  $CURRENT_VERSION_CODE"
echo ""

# Prompt for new values
read -p "New version name [$CURRENT_VERSION]: " NEW_VERSION
NEW_VERSION=${NEW_VERSION:-$CURRENT_VERSION}

NEXT_VERSION_CODE=$((CURRENT_VERSION_CODE + 1))
read -p "New versionCode [$NEXT_VERSION_CODE]: " NEW_VERSION_CODE
NEW_VERSION_CODE=${NEW_VERSION_CODE:-$NEXT_VERSION_CODE}

if [ "$NEW_VERSION_CODE" -le "$CURRENT_VERSION_CODE" ]; then
  echo "Error: versionCode must be greater than $CURRENT_VERSION_CODE"
  exit 1
fi

echo ""
echo "Building with:"
echo "  version:      $NEW_VERSION"
echo "  versionCode:  $NEW_VERSION_CODE"
echo ""
read -p "Proceed? (y/n) " CONFIRM
if [ "$CONFIRM" != "y" ]; then
  echo "Aborted."
  exit 0
fi

# Update app.json
node -e "
const fs = require('fs');
const config = JSON.parse(fs.readFileSync('$APP_JSON', 'utf8'));
config.expo.version = '$NEW_VERSION';
config.expo.android.versionCode = $NEW_VERSION_CODE;
fs.writeFileSync('$APP_JSON', JSON.stringify(config, null, 2) + '\n');
"

echo ""
echo "Updated $APP_JSON"
echo ""

# Check keystore exists
KEYSTORE_PATH="keystore/flight-notes-ai.keystore"
if [ ! -f "$KEYSTORE_PATH" ]; then
  echo "Error: Keystore not found at $KEYSTORE_PATH"
  echo "Place the release keystore there before building."
  exit 1
fi

# Prebuild and build
echo "Running expo prebuild..."
npx expo prebuild --platform android --clean

echo ""
echo "Building release AAB..."
cd android && ./gradlew bundleRelease

AAB_PATH="app/build/outputs/bundle/release/app-release.aab"
if [ -f "$AAB_PATH" ]; then
  echo ""
  echo "========================================="
  echo "  Build successful!"
  echo "  AAB: android/$AAB_PATH"
  echo "  Version: $NEW_VERSION ($NEW_VERSION_CODE)"
  echo "========================================="
else
  echo "Build failed. Check the output above for errors."
  exit 1
fi
