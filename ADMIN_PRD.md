# **Product Requirements Document: Flight Notes AI — Admin Panel**

## **1. Project Overview**

The **Flight Notes AI Admin Panel** is a web-based dashboard that provides the client and operations team with full visibility and control over the Flight Notes AI platform. It enables user management, AI pipeline monitoring, content management, and analytics — all without requiring direct database access or code deployments.

## **2. Platform & Stack**

* **Framework:** Next.js (App Router) with TypeScript
* **UI:** Tailwind CSS + shadcn/ui component library (Purple-themed, consistent with the mobile app)
* **Backend:** Supabase (shared instance with mobile app, using service-role key for admin access)
* **Location:** Self-contained `admin/` directory within the existing React Native project repo. Has its own `package.json`, `node_modules`, and build pipeline — zero impact on the mobile app.
* **Auth:** Supabase Auth with admin-only role-based access (email/password for admin users, separate from mobile app auth).

## **3. Core Functional Requirements**

### **3.1 Authentication & Access Control**

* **Admin Login:** Secure email/password login for admin users only.
* **Role-Based Access:** Support for at least two roles — `super_admin` (full access) and `viewer` (read-only dashboards).
* **Session Management:** Secure session handling with automatic timeout and refresh tokens.
* **Audit Log:** Track admin actions (user suspensions, content changes, config updates) with timestamps and actor.

### **3.2 User & Subscription Management**

* **User Directory:** Searchable, filterable, and paginated list of all registered users.
  * Display: Name, email, auth provider (Google/Apple/Email), sign-up date, last active, subscription status.
* **User Detail View:** Drill-down into individual user profiles.
  * Activity summary: Total notes, recordings, flashcards generated, quiz attempts.
  * Subscription history: Plan, start date, renewal date, payment status.
  * Action buttons: Suspend account, reactivate, delete account (with confirmation).
* **Subscription Overview:** Aggregate view of active subscribers, trial users, churned users, and revenue metrics (pulled from RevenueCat webhook data stored in Supabase).

### **3.3 AI Pipeline Monitoring & Error Tracking**

* **Job Queue Dashboard:** Real-time view of all AI processing jobs (transcription, summarization, flashcard generation).
  * Columns: Job ID, user, type, status (queued/processing/completed/failed), created at, completed at, duration.
  * Filters: By status, type, date range.
* **Error Log:** Dedicated view for failed jobs with error details, input metadata, and retry button.
* **API Usage Metrics:** OpenAI API consumption tracking.
  * Total tokens used (daily/weekly/monthly).
  * Cost estimates per feature (transcription vs. summarization vs. flashcards vs. chatbot).
  * Average response times per endpoint.
* **Alerts:** Configurable thresholds for failure rate spikes and API cost overruns (email notifications to admin).

### **3.4 Content & Resource Management (CMS)**

* **Resource Library Manager:** CRUD interface for managing aviation resources.
  * Upload/replace FAA PDF documents and manuals.
  * Assign categories, tags, and display order.
  * Toggle visibility (published/draft/archived).
* **Quiz Question Bank:** CRUD for MCQ questions used in the "Test Yourself" module.
  * Fields: Question text, four options, correct answer, topic/category, difficulty level.
  * Bulk import via CSV/JSON upload.
  * Preview mode to see how questions render.
* **Oral Exam Prompts:** Manage examiner persona prompts and exam scenarios.
  * Edit system prompts and context instructions.
  * Version history for prompt changes.
* **AI Chatbot Configuration:** Manage the aviation chatbot's system prompt, context documents, and behavior rules without code changes.
* **Push Notifications:** Compose and send push notifications to all users or filtered segments (by subscription tier, category interest, or last active date).

### **3.5 Analytics Dashboard**

* **Overview Metrics (Top-Level Cards):**
  * Total users, daily/weekly/monthly active users (DAU/WAU/MAU).
  * Total notes created, recordings uploaded, flashcards generated.
  * Subscription conversion rate (free → paid), churn rate.
* **Feature Usage Charts:**
  * Recording vs. upload counts over time.
  * Most popular categories (PPL, Instrument, Commercial).
  * AI feature usage breakdown (transcription, summarization, flashcards, chatbot queries).
  * Quiz completion rates and average scores by topic.
* **Engagement Metrics:**
  * Average session duration.
  * Retention cohorts (Day 1, Day 7, Day 30).
  * Flashcard review frequency.
* **Revenue Dashboard:**
  * MRR (Monthly Recurring Revenue) and trend.
  * New subscriptions vs. cancellations over time.
  * Revenue by plan tier.

## **4. UI/UX Guidelines**

* **Theme:** Purple-themed, matching the mobile app's visual identity. Dark mode support.
* **Layout:** Sidebar navigation with collapsible sections. Top bar with admin user info, notifications bell, and quick search.
* **Responsiveness:** Fully responsive for desktop and tablet use. Mobile admin access is secondary but functional.
* **Data Tables:** Sortable, filterable, with pagination and export to CSV.
* **Charts:** Recharts or Chart.js for all data visualizations, consistent color palette.

## **5. Technical & Development Expectations**

* **Project Structure:**
  ```
  flight-notes-ai/
  ├── src/                   # Existing React Native source
  ├── android/               # Existing Android project
  ├── ios/                   # Existing iOS project
  ├── package.json           # Existing RN package.json
  ├── admin/                 # ← New, self-contained Next.js app
  │   ├── package.json       # Admin-specific dependencies
  │   ├── next.config.js
  │   ├── tsconfig.json
  │   ├── .env.local         # Supabase service-role key, etc.
  │   ├── src/
  │   │   ├── app/           # Next.js App Router pages
  │   │   ├── components/    # Admin UI components
  │   │   ├── lib/           # Supabase client, utils, helpers
  │   │   └── types/         # TypeScript types (copied from mobile where needed)
  │   └── README.md
  ├── .gitignore
  └── README.md
  ```
  The `admin/` directory is fully independent — it has its own `node_modules`, build scripts, and deploy config. The mobile app's Metro bundler, Gradle, and Xcode builds are completely unaffected.
* **Shared Types:** Supabase table interfaces and common enums are copied into `admin/src/types/`. Minimal duplication at MVP scale; can be extracted into a shared package later if needed.
* **Database:** Supabase Postgres with Row-Level Security (RLS) policies. Admin panel uses service-role key to bypass RLS where needed.
* **API:** Next.js API routes (Route Handlers) for any server-side logic. No separate backend service required for MVP.
* **Deployment:** Vercel for the admin panel (deploy only the `admin/` directory via Vercel's root directory setting). Environment variables for Supabase keys, OpenAI keys, and RevenueCat webhook secrets.
* **Source Control:** Same GitHub repository as the mobile app. Feature branches and PR-based workflow. The `admin/` folder is simply a new top-level directory in the existing repo.

## **6. Development Roadmap**

### **Phase 1 (Admin MVP — Ships with Mobile MVP)**

* Admin Authentication & Role-Based Access.
* User Directory & Subscription Management.
* AI Pipeline Job Dashboard & Error Tracking.
* Resource Library & Quiz Question Bank Management.
* Analytics Overview Dashboard.

### **Phase 2 (Post-MVP Enhancements)**

* Advanced retention cohort analytics.
* Push notification composer with segment targeting.
* AI Chatbot prompt versioning and A/B testing.
* Audit log viewer.
* Bulk user export and data compliance tools.

## **7. Success Criteria**

* Admin can view and manage all users without direct database access.
* Failed AI jobs are visible and retriable within 2 clicks.
* Content (PDFs, quiz questions, chatbot config) can be updated without a code deployment.
* Key business metrics (users, revenue, engagement) are available at a glance.
* Admin panel loads within 2 seconds on standard broadband.

**Project:** Flight Notes AI — Admin Panel