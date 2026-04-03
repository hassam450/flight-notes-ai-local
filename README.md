# Flight Notes AI ✈️📝

**Flight Notes AI** is an all-in-one study and note management application specifically designed for student pilots. The platform leverages AI to provide summarization, transcription, and flashcard generation to streamline the aviation learning process.

## 🚀 Overview

The goal of Flight Notes AI is to deliver a clean, reliable, and scalable mobile experience for aviation students, helping them manage their learning materials efficiently with the power of AI.

## ✨ Core Features

- **Audio Recording & Transcription:** Capture lectures or flight notes and convert them to text automatically.
- **AI Summarization:** Get concise summaries of lengthy recordings or documents.
- **Smart Flashcards:** Automatically generate study flashcards from your note content.
- **Aviation Toolkit:**
  - AI Chatbot for quick aviation queries.
  - Resource Library with search/filter.
  - Integrated FAA PDF Viewer.
- **Test Yourself:** Multiple-choice quizzes and AI-driven oral exam practice.
- **History & Management:** Track your study sessions and categorize notes (PPL, Instrument, Commercial).

## 🛠 Technical Stack

- **Framework:** React Native / Expo (SDK 54)
- **Navigation:** Expo Router (File-based routing)
- **Styling:** NativeWind v4 (Tailwind CSS)
- **Language:** TypeScript
- **State Management:** React Hooks
- **Icons:** Expo Symbols / Vector Icons

## 📦 Getting Started

### 1. Prerequisites
- Node.js (Latest LTS recommended)
- Watchman (for macOS users)
- Expo Go app on your mobile device (or Android/iOS emulator)

### 2. Installation
```bash
npm install
```

### 3. Environment Setup
```bash
cp .env.example .env
```
Fill in Supabase and Google OAuth credentials. All client-side env vars use the `EXPO_PUBLIC_` prefix.

### 4. Start Developing
```bash
npm start
```
Use the interactive terminal to open the app on:
- `i` - iOS Simulator
- `a` - Android Emulator
- `w` - Web browser

## 📁 Project Structure

```text
src/
├── app/          # Expo Router pages (routes)
├── assets/       # Images, fonts, and static resources
├── components/   # Reusable UI components
├── constants/    # Theme, colors, and global constants
├── hooks/        # Custom React hooks
├── services/     # API and external integrations
├── styles/       # Global CSS (Tailwind)
└── types/        # TypeScript type definitions
```

## Android Release Build (Play Store)

### Prerequisites
- Java 17 (`brew install openjdk@17`)
- Android SDK with build-tools and NDK
- `ANDROID_HOME` environment variable set
- Release keystore at `keystore/flight-notes-ai.keystore`

### Keystore
The release keystore must be placed at `keystore/flight-notes-ai.keystore`. This file is gitignored and must be obtained from the team. To generate a new one:

```bash
keytool -genkeypair -v -storetype JKS -keyalg RSA -keysize 2048 -validity 10000 \
  -keystore keystore/flight-notes-ai.keystore -alias flight-notes-ai
```

Signing config is injected automatically during prebuild via `plugins/withAndroidReleaseSigning.js`. Update keystore credentials there if they change.

### Building the AAB
```bash
npm run build:android
```

This will:
1. Prompt for the new version name and versionCode
2. Update `app.json` with the new values
3. Run `npx expo prebuild --platform android --clean`
4. Build the signed AAB via `./gradlew bundleRelease`
5. Output the AAB at `android/app/build/outputs/bundle/release/app-release.aab`

Upload the AAB to the Google Play Console.

### Version Management
Versions are managed in `app.json` and bumped automatically by the build script:

- `expo.version` — User-facing version shown on Play Store (e.g. `"1.0.0"`)
- `expo.android.versionCode` — Integer that must increment by at least 1 for every Play Store upload

### Manual Build (without script)
1. Update `version` and `android.versionCode` in `app.json`
2. ```bash
   npx expo prebuild --platform android --clean
   cd android && ./gradlew bundleRelease
   ```
3. AAB at `android/app/build/outputs/bundle/release/app-release.aab`
