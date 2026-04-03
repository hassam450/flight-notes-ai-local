# Tutor Module — Roadmap & Recommendations

> Written: 2026-02-20 | Context: Tasks 4.1 (MCQs) and 4.2 (Oral Exam Practice)

## Current State (Post Task 4.1)

Task 4.1 delivered the core MCQ quiz engine:
- ✅ AI-generated MCQ questions via Supabase Edge Function (`ai-mcq`)
- ✅ Quiz question screen with timer, 4-option selection, explanations
- ✅ Results screen with score, strengths/weaknesses breakdown
- ✅ Tutor landing screen with header, Learning Modes cards, Study Topics grid

### Known Gaps

| # | Gap | Current Behavior | What's Needed |
|---|-----|-----------------|---------------|
| 1 | **Certification Readiness** | Hardcoded (PPL: 75%, Instrument: 15%) | Calculate from actual quiz + oral exam history |
| 2 | **MCQ Card Navigation** | Tapping "Topic Quizzes" starts a PPL quiz immediately | Should open a category picker first |
| 3 | **Study Topics Mastery** | Hardcoded "0% Mastery" for all topics | Calculate from per-topic performance data |
| 4 | **View All Button** | Non-functional | Needs a dedicated all-topics screen |

---

## Task 4.2 — Oral Exam Practice

From TASKS.md:
- **4.2.1** Set up AI Chat context for "Examiner" persona
- **4.2.2** Build Text-based mock exam interface
- **4.2.3** Integrate Text-to-Speech (TTS) for examiner questions
- **4.2.4** Integrate Speech-to-Text (STT) for user responses

The Tutor landing screen already has the **AI Oral Prep card** (purple gradient) as the entry point for this feature. It currently does nothing.

---

## How 4.1 and 4.2 Share Infrastructure

The Tutor tab is a **unified hub** for both learning modes:

```
┌─────────────────────────────────────┐
│         Tutor Landing Screen        │
├──────────────┬──────────────────────┤
│  AI Oral     │  Topic Quizzes       │
│  Prep Card   │  (MCQ) Card          │
│  → Task 4.2  │  → Task 4.1          │
├──────────────┴──────────────────────┤
│  Certification Readiness            │
│  → Aggregates BOTH modes            │
├─────────────────────────────────────┤
│  Study Topics (Mastery %)           │
│  → Aggregates BOTH modes per topic  │
└─────────────────────────────────────┘
```

### Shared Dependencies

| Component | Used By | Why It Must Be Shared |
|-----------|---------|----------------------|
| **Learning History DB Table** | MCQs + Oral Exams | Both modes produce scored results that feed Readiness & Mastery |
| **Category Picker** | MCQs + Oral Exams | Both modes need the user to choose PPL, Instrument, etc. before starting |
| **Per-Topic Scoring** | Readiness + Mastery | Aggregation logic operates on data from both modes |

---

## Recommended Build Order

### Phase A — Shared Persistence Layer (do first)

Build a `learning_sessions` Supabase table before either mode tracks data:

```sql
-- Proposed schema
create table learning_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id),
  mode text not null check (mode in ('mcq', 'oral_exam')),
  category text not null,          -- PPL, Instrument, etc.
  topic text,                      -- Weather Theory, Airspace, etc.
  score integer not null,
  total integer not null,
  percentage integer not null,
  time_taken_seconds integer,
  strengths jsonb,                 -- topic performance array
  weaknesses jsonb,                -- topic performance array
  created_at timestamptz default now()
);
```

**Why first**: Without this, Readiness and Mastery will remain hardcoded even after 4.2 is built.

### Phase B — Fix MCQ Flow + Category Picker

1. Add a **category picker modal/screen** that opens when tapping the MCQ card
2. Save MCQ results to `learning_sessions` after quiz completion
3. Wire up **Certification Readiness** to query aggregated scores
4. Wire up **Study Topics Mastery** to query per-topic scores

### Phase C — Build Task 4.2 (Oral Exam)

1. **4.2.1** — AI Chat "Examiner" persona (Edge Function + system prompt)
2. **4.2.2** — Text-based chat interface (category-scoped)
3. **4.2.3** — TTS for examiner questions
4. **4.2.4** — STT for user responses
5. Save oral exam sessions to the same `learning_sessions` table

### Phase D — View All + Polish

1. Build the **all-topics screen** (View All button)
2. Each topic card → can launch either MCQ or oral exam for that topic
3. Readiness & Mastery now auto-update from real data across both modes

---

## Alternative: Build 4.2 First, Persist Later

If speed is preferred over correctness:

1. Build 4.2 (oral exam) with no persistence
2. Build persistence layer afterward
3. Retrofit both MCQs and oral exam to save results

**Downside**: More rework, Readiness/Mastery remain hardcoded until the retrofit is done.

---

## Summary

| Approach | Pros | Cons |
|----------|------|------|
| **Phase A→B→C→D** (recommended) | Clean architecture, no rework, features light up incrementally | Slightly longer before 4.2 is visible |
| **4.2 first, persist later** | Oral exam demo-able sooner | Rework needed, Readiness/Mastery stay broken longer |
