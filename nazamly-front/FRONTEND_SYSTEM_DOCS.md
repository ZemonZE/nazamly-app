# Nazamly Student Frontend System Documentation

Last updated: April 26, 2026  
Scope: Student web frontend only (nazamly-front), excluding admin panel

---

## 1. Purpose

This document describes the current architecture of the Nazamly student web app, including:

- Runtime flow and routing
- Feature modules and responsibilities
- API integration surface
- State and persistence strategy
- Styling system
- Technical debt and refactor priorities
- Recommended Spline 3D integration points
- Integration workflow for v0/lovable designs

---

## 2. Stack and Runtime

### Core stack

- React 19
- Vite 6
- React Router DOM 7
- Firebase Auth (email/password + Google)
- REST APIs (fetch)
- SSE (EventSource) for streaming question generation

### Build and local runtime

- Dev command: npm run dev
- Build command: npm run build
- Vite proxy: /api -> http://localhost:5000 (when VITE_API_URL is not set)

### Key entry files

- src/main.jsx: app bootstrap, StrictMode, BrowserRouter
- src/App.jsx: top-level auth state and route tree
- src/firebase.js: Firebase initialization and API base URL helper

---

## 3. High-Level Architecture

The current frontend follows a route-centric architecture:

1. Authentication layer
- Login and signup screens
- Firebase sign-in + backend sync call

2. Dashboard shell
- Sidebar + top header + nested routes
- Shared layout context for user and logout

3. Feature pages
- Each major academic tool is implemented as a page module
- Some pages are very large and include both UI and business logic

4. Service layer (partial)
- GPA and materials have dedicated service modules
- Other features still call APIs directly from page components

---

## 4. Route Map

### Public route

- /login

### Protected routes under dashboard shell

- /dashboard
- /dashboard/gpa-calculator
- /dashboard/gpa-planner
- /dashboard/materials
- /dashboard/questions
- /dashboard/generator
- /dashboard/coding
- /dashboard/profile
- /dashboard/settings

### Protected standalone full-page route

- /dashboard/coding/problems/:id

### Fallback route

- * -> /login

---

## 5. Authentication Flow

### Firebase login/signup

- Login and signup use Firebase Auth directly.
- Google login uses popup provider.

### Backend user sync

After successful Firebase authentication, frontend posts Firebase ID token to:

- POST /api/auth/sync

This sync call is currently done in multiple places:

- App auth observer
- Login screen
- Signup screen

### Current auth state ownership

- App.jsx owns user and authLoading states.
- User object is passed into dashboard layout and child routes.

---

## 6. Feature Module Breakdown

## 6.1 Dashboard Home

File: src/components/Dashboard.jsx

Responsibilities:

- Shows summary cards (GPA, account status, join date)
- Displays available tool cards and quick navigation links

## 6.2 Dashboard Layout Shell

File: src/components/DashboardLayout.jsx

Responsibilities:

- Sidebar navigation and collapsible behavior
- User avatar and profile shortcut
- Route-aware page title/subtitle metadata
- Header badge for CGPA
- Provides Outlet context with user and onLogout

## 6.3 GPA Calculator

File: src/pages/GpaCalculator.jsx

Responsibilities:

- Local course list editing
- Converts marks to grade points for local display
- Calls backend GPA calculation endpoint for authoritative result

## 6.4 GPA Planner

File: src/pages/GpaPlanner.jsx

Responsibilities:

- Onboarding profile (CGPA + completed hours)
- Local projections
- Server-side calculation and target strategy
- Term courses CRUD
- Tabbed planner experience (calculator vs strategy)

Notes:

- Large single-file module with mixed concerns (state, math, UI rendering)
- Uses localStorage for profile cache

## 6.5 Materials Center

File: src/pages/Materials.jsx

Responsibilities:

- Fetches student courses with material folder metadata
- Course-detail view with subfolder tabs
- Fetches files per subfolder and renders metadata/cards

## 6.6 Questions Engine

File: src/pages/Questions.jsx

Responsibilities:

- AI exam generation tab
- Past archive tab
- Quiz history tab
- SSE stream handling for generated questions
- Answering, grading submission, and review rendering
- Per-type analytics (MCQ, T/F, essay)

Notes:

- Largest behavior surface in the frontend
- Handles many UI states in one component

## 6.7 Schedule Generator

File: src/pages/Generator.jsx

Responsibilities:

- Manual schedule builder
- Smart AI schedule generation from uploaded files
- Saves generated schedule to mobile-compatible backend endpoint
- Exports schedule to styled PDF using html2canvas + jsPDF

Notes:

- Includes complex DOM cloning/style injection for PDF output

## 6.8 Coding Problems List

File: src/pages/CodingProblems.jsx

Responsibilities:

- Fetches courses and coding problems
- Sort, filter, grouping by topic
- Difficulty visibility preference toggle persisted to backend

## 6.9 Coding Problem Solver

File: src/pages/ProblemSolver.jsx

Responsibilities:

- Problem markdown rendering with math
- Language-aware code editor area
- Run against sample tests
- Submit for judged verdict
- Submission history

## 6.10 Profile

File: src/pages/Profile.jsx

Responsibilities:

- Account summary
- Graduation progress visualization
- Quiz history snapshot
- Goal tracker view

Notes:

- Includes mock coding history data at present

## 6.11 Settings

File: src/pages/Settings.jsx

Responsibilities:

- Account info presentation
- Local-only preference toggles
- Logout and delete confirmation dialog UI

---

## 7. Shared Components and UI Primitives

- FormInput: shared auth form input wrapper
- ThemeToggle: global dark/light mode toggle
- InfoPanel: marketing panel in auth layout
- Icons: centralized SVG icon libraries under src/Icons

---

## 8. API Integration Surface

## 8.1 Service modules

### gpaService.js

- POST /api/gpa/calculate
- POST /api/gpa/target-strategy
- PATCH /api/auth/profile
- GET/POST/DELETE /api/gpa/my-courses

### materialsService.js

- GET /api/course-materials/my-courses
- GET /api/course-materials/:courseCode/files/:subFolderType
- POST /api/course-materials/:courseCode/upload/:subFolderType
- POST /api/course-materials/init

## 8.2 Direct feature-level API calls (outside services)

- Auth sync from App/Login/Signup
- Coding pages endpoints
- Questions generation/archive/history/submit
- Generator AI and schedule save endpoints
- Courses fetch for coding module

## 8.3 Full endpoint inventory used by nazamly-front

- /api/auth/sync
- /api/auth/profile
- /api/courses
- /api/gpa/calculate
- /api/gpa/target-strategy
- /api/gpa/my-courses
- /api/course-materials/my-courses
- /api/course-materials/:courseCode/files/:subFolderType
- /api/course-materials/:courseCode/upload/:subFolderType
- /api/course-materials/init
- /api/questions/generate-stream
- /api/questions/archive
- /api/student/quizzes/submit
- /api/student/quizzes/history
- /api/ai/generate
- /api/schedule/save-ai
- /api/coding/problems
- /api/coding/problems/:id
- /api/coding/problems/:id/difficulty-preference
- /api/coding/run
- /api/coding/submissions

---

## 9. State and Persistence Strategy

### React local state

Most feature modules rely on useState/useEffect/useMemo/useCallback with component-level state ownership.

### Local storage keys currently used

- nazamly-theme: theme preference
- schedules: manual schedule generator data
- nazamly-gpa-profile: GPA planner onboarding profile
- nazamly-lang: configured by i18n setup file

### Observations

- No centralized state manager (Redux/Zustand/etc.)
- State boundaries are route/page-based
- Significant state complexity in Questions and Generator modules

---

## 10. Styling System

### Current styling approach

- Global token/theme definitions in App.css
- Route and feature styling via plain CSS files
- Heavy reliance on shared class names and global cascade

### Notable files

- src/App.css (theme tokens + auth shell)
- src/styles/Dashboard.css (very large multi-domain stylesheet)
- src/styles/GpaPlanner.css
- src/styles/ProblemSolver.css
- src/styles/Profile.css
- src/styles/Materials.css
- src/styles/CodingProblems.css

### Key maintainability concern

Dashboard.css contains styles for multiple unrelated feature areas (dashboard shell, GPA calculator, generator, questions, archive, history widgets, etc.), increasing coupling and refactor risk.

---

## 11. Confirmed Gaps and Technical Debt

1. Large monolithic feature files
- Questions.jsx
- Generator.jsx
- GpaPlanner.jsx

2. Repeated auth token/header logic
- Duplicated getIdToken(true) + Authorization header creation across components/pages/services

3. Partial service-layer adoption
- Some features use service modules, others call fetch directly in UI components

4. Styling coupling
- Large global stylesheet with mixed feature concerns

5. Testing baseline
- No frontend test files currently detected

6. i18n integration mismatch
- src/i18n.js exists but is not wired into app bootstrap
- locale JSON files imported by i18n.js are not currently present in src/locales

7. Legacy artifact
- old_gen.jsx exists but is empty and not referenced

---

## 12. Refactor Blueprint (Recommended)

## Phase 0: Baseline and Safety

- Add smoke tests for login route, protected dashboard route, and one critical API flow
- Add lint checks to CI for frontend package
- Freeze current API contracts in docs

## Phase 1: Platform Foundation

- Create shared API client with:
  - Auth token injection
  - Unified error normalization
  - Retry and timeout policy
- Replace duplicate auth header helpers gradually

## Phase 2: Feature Decomposition

- Split Questions page into:
  - QuestionConfigPanel
  - QuestionGenerationEngine
  - QuestionArchiveExplorer
  - QuizHistoryViewer
  - hooks for generation, submission, archive

- Split Generator page into:
  - ManualBuilder
  - SmartGenerator
  - PdfExportService
  - ScheduleSaveService

- Split GpaPlanner page into:
  - ProfileOnboarding
  - CurrentTermCalculator
  - TargetStrategyPlanner

## Phase 3: Styling Refactor

- Move feature-specific styles from Dashboard.css into scoped files per feature
- Keep only shell-level and shared utility styles in shell/global files
- Optionally migrate to CSS Modules for isolation

## Phase 4: Design System + New UI Integration

- Create presentational UI layer with reusable primitives
- Integrate v0/lovable layouts against stable data hooks/services
- Preserve route contracts and backend API payload shapes during migration

---

## 13. Spline 3D Integration Recommendations

Goal: Add expressive 3D moments without harming performance or study-task focus.

## 13.1 Best placement priorities

Priority A (high impact, safe)

1. Auth hero/info panel
- File: src/components/InfoPanel.jsx
- Why: strong first impression, isolated from heavy interactions

2. Dashboard welcome zone
- File: src/components/Dashboard.jsx
- Why: brand identity and motivational entry moment

3. Smart Questions generation loading panel
- File: src/pages/Questions.jsx
- Why: visual storytelling for AI generation state

4. Smart schedule upload/generation section
- File: src/pages/Generator.jsx
- Why: aligns with automation concept

Priority B (optional)

5. Profile goal tracker card
- File: src/pages/Profile.jsx
- Why: progress metaphor and engagement

6. GPA planner onboarding card
- File: src/pages/GpaPlanner.jsx
- Why: contextual but secondary to core planner inputs

## 13.2 Where to avoid heavy 3D

- Problem solver editor workspace (focus-critical)
- Dense forms with frequent typing and validation interactions

## 13.3 Integration constraints

- Lazy load Spline scenes with code-splitting
- Use static fallback image placeholder
- Disable or simplify on low-end/mobile devices
- Respect reduced-motion user preference
- Keep max one major interactive scene per screen

## 13.4 Suggested wrapper component contract

Create one shared component, for example SplineScene, with props:

- sceneUrl
- fallbackImage
- priority (hero, normal)
- mobileMode (disable, static, interactive)
- ariaLabel

This keeps 3D behavior standardized across pages.

---

## 14. v0/lovable Integration Workflow

When importing generated designs:

1. Map each generated section to an existing route/page container.
2. Replace presentational layer first, keep existing data flow intact.
3. Move existing business logic into hooks if not already extracted.
4. Validate API payloads did not change.
5. Add visual regression checks for major dashboard and auth screens.
6. Add performance budget checks for 3D scenes.

---

## 15. Immediate Action Checklist

- [ ] Add shared apiClient with token and error policy
- [ ] Wire i18n intentionally or remove until ready
- [ ] Split Questions.jsx into feature submodules
- [ ] Split Generator.jsx into builder/generator/services
- [ ] Break Dashboard.css into feature-level style files
- [ ] Add basic frontend test coverage
- [ ] Introduce reusable Spline wrapper and add first hero scene

---

## 16. Ownership Notes

This document is intended to be the source of truth for student frontend architecture and should be updated whenever:

- Routes change
- Endpoint contracts change
- New feature modules are added
- Styling architecture is reorganized
- 3D integration strategy changes
