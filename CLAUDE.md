# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Package Manager
**Always use npm** — this project uses npm as the package manager.

## Development Commands
- `npm start` — Start Expo dev server
- `npm run android` — Run on Android
- `npm run ios` — Run on iOS
- `npm run web` — Run web version
- `npm run lint` — Run ESLint (`expo lint`)
- `npm run build:android` — Build signed AAB for Play Store
- No test runner is currently configured

## Environment Setup
Copy `.env.example` to `.env` and fill in Supabase and Google OAuth credentials. All client-side env vars use the `EXPO_PUBLIC_` prefix. OpenAI keys live in Supabase Function secrets, not in the client `.env`.

## Architecture Overview

### Tech Stack
- **React Native 0.81.5** with **Expo SDK 54** (New Architecture enabled)
- **expo-router v6** — file-based routing in `src/app/`
- **NativeWind v4** + Tailwind CSS 3.4 for styling
- **Supabase** — auth, database, and edge functions (AI backend)
- **React Context** for state management (no Redux)
- **SQLite** (expo-sqlite) for local recording persistence
- **TypeScript** in strict mode with `@/*` path alias mapping to `./src/*`

### Source Layout (`src/`)
- `app/` — Expo Router screens and layouts
  - `(tabs)/` — Bottom tab screens (Home, Testing, Toolkit, History, Profile)
  - `(auth)/` — Auth screens (sign-in, sign-up, forgot-password)
  - Route groups use parentheses `()`, dynamic segments use brackets `[id]`
- `components/` — Reusable UI components; `ui/` subfolder for primitives
- `contexts/` — React Context providers (`auth-context.tsx` is the primary one)
- `services/` — Business logic organized by domain:
  - `ai/` — AI job orchestration (transcription, summary, flashcards, MCQ)
  - `auth/` — Google and Apple OAuth flows
  - `notes/` — Note CRUD and assessment notes
  - `quiz/` — Quiz, oral exam, learning sessions, prebuilt assessments
  - `recorder/` — Audio recording, SQLite storage, upload, migration
  - `toolkit/` — Aviation chat, resource library, weather briefs
- `hooks/` — Custom hooks (theme, recorder session)
- `lib/` — Utilities (`supabase.ts` client config)
- `types/` — TypeScript interfaces organized by feature
- `constants/` — Theme colors, storage keys, categories, quiz topics, checklists
- `styles/` — `global.css` with Tailwind imports

### Supabase Edge Functions (`supabase/functions/`)
Serverless functions for AI features: `ai-transcription`, `ai-summary`, `ai-flashcards`, `ai-mcq`, `ai-oral-exam`, `ai-chat`, `ai-chat-stream`, `ai-stt`, `ai-jobs`, `ai-jobs-worker`, `wx-brief`. Shared utilities in `_shared/`. These are excluded from the TypeScript project config.

### Navigation & Auth Flow
- Root layout (`src/app/_layout.tsx`) wraps everything in `AuthProvider` → `ThemeProvider` (DarkTheme enforced) → `AuthGuard`
- `AuthGuard` redirects unauthenticated users to `(auth)/sign-in` and authenticated users away from auth screens
- Stack navigator at root level; tab navigator nested under `(tabs)`
- Auth supports Google Sign-In, Apple Sign-In, and email/password via Supabase

### Styling
- NativeWind (Tailwind CSS for React Native) — use `className` props
- Babel configured with `nativewind/babel` preset and `jsxImportSource: "nativewind"`
- Metro configured with NativeWind's `withNativeWind` wrapper, input CSS at `./src/styles/global.css`
- Dark theme only — colors defined in `src/constants/theme.ts`
- Platform-specific files use suffixes: `.ios.ts`, `.web.ts`

### Data Persistence
- **Remote**: Supabase (auth, profiles, notes, learning sessions, AI jobs)
- **Local**: SQLite via expo-sqlite for audio recordings with migration support
- **Secure storage**: expo-secure-store on native, AsyncStorage on web (adapter in auth context)

## Key Conventions
- All source code lives under `src/` — imports use `@/` path alias
- Services handle all external API calls; components consume via hooks/context
- Types are colocated by feature in `src/types/`
- React Compiler experiments enabled (`app.json`)
- Typed routes enabled via Expo Router
- Android requires RECORD_AUDIO permission; iOS has microphone usage description configured
