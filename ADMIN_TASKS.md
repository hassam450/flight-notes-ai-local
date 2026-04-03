# **Flight Notes AI — Admin Panel Task Breakdown & Complexity Assessment**

This document breaks down the Flight Notes AI Admin Panel into actionable developer tasks. Complexity is assessed as **Low (L)**, **Medium (M)**, or **High (H)**. Any task originally assessed as M or H has been further decomposed into Low-complexity sub-tasks.

## **1. Project Setup & Admin Infrastructure**

**Overall Complexity: Low**

- **1.1 Admin Directory Initialization (L)**
  - Create `admin/` directory in the existing `flight-notes-ai` repo root.
  - Initialize Next.js (App Router) project with TypeScript inside `admin/`.
  - Configure Tailwind CSS with Purple theme tokens (matching mobile app palette).
  - Install and configure shadcn/ui component library.
  - Copy shared Supabase types from the mobile app into `admin/src/types/`.
- **1.2 Admin Authentication (M → L)**
  - **1.2.1** Create Supabase admin-only auth with email/password (L).
  - **1.2.2** Implement role-based middleware (`super_admin` / `viewer`) using Next.js middleware (L).
  - **1.2.3** Build login page, session handling, and protected route wrapper (L).
- **1.3 Admin Shell & Navigation (L)**
  - Build sidebar layout with collapsible navigation sections.
  - Implement top bar with admin user info, notification bell placeholder, and global search.
  - Set up routing structure for all dashboard sections.

## **2. User & Subscription Management**

**Overall Complexity: Medium**

- **2.1 User Directory (M → L)**
  - **2.1.1** Create Supabase query for paginated user listing with search/filter (L).
  - **2.1.2** Build data table component with sorting, filtering, and pagination (L).
  - **2.1.3** Add export-to-CSV functionality for user list (L).
- **2.2 User Detail View (M → L)**
  - **2.2.1** Build user profile detail page with activity summary cards (L).
  - **2.2.2** Display subscription history timeline (from RevenueCat webhook data) (L).
  - **2.2.3** Implement admin actions: suspend, reactivate, delete account with confirmation modals (L).
- **2.3 Subscription Overview (M → L)**
  - **2.3.1** Set up RevenueCat webhook endpoint in Next.js API routes to store subscription events in Supabase (L).
  - **2.3.2** Build aggregate subscription dashboard cards (active, trial, churned counts) (L).
  - **2.3.3** Build subscription trend chart (new subs vs. cancellations over time) (L).

## **3. AI Pipeline Monitoring & Error Tracking**

**Overall Complexity: Medium-High**

- **3.1 Job Queue Dashboard (M → L)**
  - **3.1.1** Design Supabase schema for AI job tracking (`ai_jobs` table: id, user_id, type, status, timestamps, error_details, token_count) (L).
  - **3.1.2** Build real-time job queue table with status filters and date range picker (L).
  - **3.1.3** Implement auto-refresh / Supabase Realtime subscription for live status updates (L).
- **3.2 Error Management (M → L)**
  - **3.2.1** Build filtered error log view with expandable error details (L).
  - **3.2.2** Implement retry mechanism — API route that re-queues a failed job (L).
  - **3.2.3** Add bulk retry for multiple failed jobs (L).
- **3.3 API Usage & Cost Tracking (M → L)**
  - **3.3.1** Log OpenAI token usage per request in the `ai_jobs` table (L).
  - **3.3.2** Build usage metrics dashboard — daily/weekly/monthly token consumption with cost estimates (L).
  - **3.3.3** Build average response time chart per AI feature type (L).
- **3.4 Alert System (M → L)**
  - **3.4.1** Build admin settings page for configurable alert thresholds (failure rate %, cost ceiling) (L).
  - **3.4.2** Implement cron-based check (Supabase Edge Function or Vercel Cron) that triggers email alerts (L).

## **4. Content & Resource Management (CMS)**

**Overall Complexity: Medium**

- **4.1 Resource Library Manager (M → L)**
  - **4.1.1** Design Supabase schema for resources (`resources` table: id, title, category, file_url, tags, status, sort_order) (L).
  - **4.1.2** Build CRUD interface with file upload to Supabase Storage (L).
  - **4.1.3** Implement drag-and-drop reordering and publish/draft/archive toggle (L).
- **4.2 Quiz Question Bank (M → L)**
  - **4.2.1** Design Supabase schema for quiz questions (`questions` table: id, question_text, options JSON, correct_answer, topic, difficulty) (L).
  - **4.2.2** Build CRUD interface with inline editing and question preview (L).
  - **4.2.3** Implement bulk import from CSV/JSON with validation and error reporting (L).
- **4.3 Oral Exam Prompt Manager (L)**
  - Build editor for examiner persona system prompts with save and version history.
  - Build exam scenario list with CRUD and category assignment.
- **4.4 AI Chatbot Configuration (L)**
  - Build system prompt editor with live character/token count.
  - Build context document manager (upload/remove reference docs fed to the chatbot).
- **4.5 Push Notification Composer (M → L)**
  - **4.5.1** Build notification compose form with title, body, and deep link target (L).
  - **4.5.2** Implement audience segmentation filters (subscription tier, category interest, last active) (L).
  - **4.5.3** Integrate with FCM/APNs via Supabase Edge Function for delivery (L).

## **5. Analytics Dashboard**

**Overall Complexity: Medium**

- **5.1 Overview Metrics (M → L)**
  - **5.1.1** Build Supabase SQL views / RPC functions for aggregate metrics (total users, DAU/WAU/MAU, total notes, conversion rate) (L).
  - **5.1.2** Build top-level metric cards with sparkline trends (L).
- **5.2 Feature Usage Charts (M → L)**
  - **5.2.1** Build recording vs. upload volume chart (line/bar, filterable by date range) (L).
  - **5.2.2** Build category popularity breakdown chart (pie/donut) (L).
  - **5.2.3** Build AI feature usage stacked bar chart (transcription, summarization, flashcards, chatbot) (L).
  - **5.2.4** Build quiz analytics — completion rates and average scores by topic (L).
- **5.3 Engagement Metrics (M → L)**
  - **5.3.1** Build session duration distribution chart (L).
  - **5.3.2** Build retention cohort heatmap (Day 1, 7, 30) (L).
- **5.4 Revenue Dashboard (M → L)**
  - **5.4.1** Build MRR trend line chart from RevenueCat webhook data (L).
  - **5.4.2** Build revenue-by-plan-tier breakdown (L).

## **6. Deployment & QA**

**Overall Complexity: Low**

- **6.1 Deployment Setup (L)**
  - Configure Vercel project pointing to `admin/` as the root directory.
  - Set up environment variables (Supabase service-role key, OpenAI key, RevenueCat webhook secret).
  - Set up preview deployments for PRs.
  - Configure custom domain (e.g., admin.flightnotesai.com).
- **6.2 Quality Assurance (L)**
  - Test role-based access (super_admin vs. viewer permissions).
  - Test data table performance with 1000+ user records.
  - Verify webhook data flow (RevenueCat → Supabase → dashboard).
  - Cross-browser testing (Chrome, Safari, Firefox).

## **Summary of Complexity**

| Category                 | Primary Difficulty | Mitigation Strategy                                                         |
| :----------------------- | :----------------- | :-------------------------------------------------------------------------- |
| **Project Setup & Infra** | Low                | Self-contained `admin/` directory; no monorepo tooling needed.              |
| **User Management**      | Medium             | Supabase admin SDK provides direct DB access; RevenueCat webhooks for subs. |
| **AI Pipeline Monitoring** | **Medium-High**  | Design `ai_jobs` table early; use Supabase Realtime for live updates.       |
| **CMS / Content**        | Medium             | Standard CRUD patterns; Supabase Storage for file uploads.                  |
| **Analytics**            | Medium             | Pre-compute with SQL views/RPCs; Recharts for visualization.                |
| **Deployment**           | Low                | Vercel handles Next.js natively; monorepo supported out of the box.         |

## **Estimated Effort (Rough)**

| Phase       | Scope                                          | Estimated Time  |
| :---------- | :--------------------------------------------- | :-------------- |
| **Phase 1** | Setup + Auth + User Mgmt + AI Monitoring + CMS + Analytics Overview | 2.5–3.5 weeks    |
| **Phase 2** | Push notifications, audit log, advanced analytics, A/B prompts       | 2–3 weeks       |

**Project:** Flight Notes AI — Admin Panel