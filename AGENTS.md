# Repository Guidelines

## Project Structure & Module Organization
- `src/app/`: Expo Router screens and route groups (`(tabs)`, `(auth)`, dynamic routes like `summary/[id].tsx`).
- `src/components/`, `src/hooks/`, `src/services/`, `src/contexts/`: shared UI, reusable logic, business services, and providers.
- `src/constants/`, `src/types/`, `src/styles/`, `src/assets/`: constants, TypeScript models, global styles, and static assets.
- `supabase/functions/`: Edge Functions (`ai-summary`, `ai-transcription`, etc.) and shared helpers in `_shared/`.
- `scripts/`: utility and SQL task scripts; root config files include `app.json`, `metro.config.js`, `tailwind.config.js`, and `tsconfig.json`.

## Build, Test, and Development Commands
- `npm install`: install dependencies.
- `npm run start`: launch Expo dev server.
- `npm run ios` / `npm run android`: run native builds locally.
- `npm run web`: run in browser.
- `npm run lint`: run Expo ESLint checks.
- `npm run reset-project`: reset local project scaffolding script.

## Coding Style & Naming Conventions
- Language: TypeScript with `strict` mode enabled; use explicit types for service boundaries.
- Linting: ESLint via `eslint-config-expo`; resolve lint findings before PR.
- Indentation: 2 spaces; keep files ASCII unless existing file requires otherwise.
- Naming:
  - Components/screens: `kebab-case.tsx` filenames in this repo (for example, `upload-progress-modal.tsx`).
  - Hooks: `use-*.ts` (for example, `use-recorder-session.ts`).
  - Services: descriptive `*-service.ts` or domain-specific module names.
- Imports: prefer alias paths like `@/services/...` for `src/*`.

## Testing Guidelines
- No formal automated test suite is committed yet.
- Minimum quality gate is `npm run lint` and manual validation on at least one target (`ios`, `android`, or `web`).
- For new features, include reproducible validation steps in PR description.

## Commit & Pull Request Guidelines
- Git history uses short, imperative summaries (for example, `Complete uploading, recording, and transcription`). Keep subject lines concise and specific.
- Keep commits focused by concern (UI, recorder, auth, Supabase function changes).
- PRs should include:
  - What changed and why.
  - Linked task/issue (if available).
  - Screenshots/video for UI updates.
  - Notes on env/config or SQL changes (especially under `scripts/` or `supabase/functions/`).
