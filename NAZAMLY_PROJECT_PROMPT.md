# Nazamly — Complete Project Prompt

## Project Overview

**Nazamly** (نظملي) is a comprehensive university student management platform designed specifically for Egyptian university students (initially targeting Cairo University's Faculty of Science — Computer Science department). The name "نظملي" means "organize for me" in Arabic, reflecting the platform's core mission: to help students organize their academic life through smart tools, AI assistance, and centralized access to study materials.

The platform consists of **four interconnected sub-projects**:
1. `nazamly-backend` — Node.js/Express REST API server
2. `nazamly-admin` — React web admin panel for university staff
3. `nazamly-front` — React web app for students (browser)
4. `nazamly-mobile` — React Native / Expo mobile app for students (iOS & Android)

---

## Tech Stack

### Backend (`nazamly-backend`)
- **Runtime:** Node.js with Express 5
- **Database:** MongoDB with Mongoose ODM
- **Authentication:** Firebase Admin SDK (JWT token verification)
- **File Storage:** Google Drive API (for study materials), local disk via Multer (for profile/student card photos)
- **AI Services:** Google Generative AI (Gemini Flash) for schedule image extraction
- **Validation:** Joi (middleware-level request validation)
- **Architecture:** MVC + Repository Pattern (Controllers → Repos → Models)
- **Key packages:** `express`, `mongoose`, `firebase-admin`, `googleapis`, `@google/generative-ai`, `multer`, `joi`, `cors`

### Admin Panel (`nazamly-admin`)
- **Framework:** React 18 with Vite
- **Routing:** React Router
- **Auth:** Firebase Authentication (Google Sign-In)
- **Styling:** Custom CSS (no UI framework)
- **State:** Local component state

### Student Web App (`nazamly-front`)
- **Framework:** React 18 with Vite
- **Routing:** React Router
- **Auth:** Firebase Authentication
- **Styling:** Custom CSS
- **State:** Local component state + localStorage (for offline schedule generator)

### Mobile App (`nazamly-mobile`)
- **Framework:** React Native 0.83 with Expo SDK 55
- **Routing:** Expo Router (file-based, tab navigation)
- **Auth:** Firebase Authentication (Email/Password + Google Sign-In)
- **Image Handling:** `expo-image-picker`, `expo-image-manipulator`
- **Animations:** `react-native-reanimated`
- **Icons:** `@expo/vector-icons` (Feather, Ionicons, MaterialCommunityIcons)
- **Platform:** Android + iOS + Web (via Expo)

---

## Authentication System

### Flow
1. Students sign in via Firebase Authentication (email/password or Google OAuth)
2. Firebase issues a JWT ID token
3. Every API request includes `Authorization: Bearer <token>` header
4. Backend `auth.middleware.js` verifies the token using Firebase Admin SDK
5. The verified Firebase UID is attached to `req.user`
6. Controllers use the UID to look up the MongoDB user document

### User Access Control
- Users with `@std.sci.cu.edu.eg` email domain are automatically granted `active` status on first sync
- All other emails start with `pending` status (requires admin approval)
- Users can also be `suspended`
- Role field exists (`student` default) for future role-based access control

### User Sync
- On first login, `POST /api/auth/sync` creates a new user document in MongoDB
- Subsequent logins update `displayName` and `photoURL` if changed in Firebase
- Profile data (CGPA, credit hours) is stored in MongoDB, not Firebase

---

## Database Models

### User Model (`user`)
```
firebaseUid       String (unique) — links to Firebase Auth
email             String (unique)
displayName       String
photoURL          String — profile photo URL (served from local /uploads)
studentCardPhotoURL String — student ID card photo URL
accessStatus      Enum: active | pending | suspended
role              String (default: "student")
currentCGPA       Number (0–5.0)
earnedCreditHours Number
pastSemesters     Array of { termName, termGPA }
timestamps        createdAt, updatedAt
```

### Academic Models

**Course**
```
courseCode        String (uppercase, unique)
courseName        String
level             Number (1–4) — academic year
creditHours       Number (0–4)
difficulty        Number (1–5, default 3) — used by GPA planner algorithm
department        String
departments       Array of ObjectId refs to Department
```

**CourseInstance** — a specific offering of a course in a semester
```
courseId          ObjectId ref Course
semesterId        ObjectId ref Semester
doctorId          ObjectId ref Doctor
```

**Department**
```
name, code, description
```

**Doctor**
```
name, email, department, photoURL, bio
```

**Enrollment** — student enrollment in a course instance
```
userId, courseInstanceId, enrollmentDate, status
```

**Semester**
```
name, startDate, endDate, isActive
```

### Schedule Models

**TimeTable** — a student's personal schedule container
```
userId            ObjectId ref User
title             String (default: "My Schedule")
entries           Array of ObjectId refs to TimeTableEntry
```

**TimeTableEntry** — a single class session in the schedule
```
userId            ObjectId ref User
timeTableId       ObjectId ref TimeTable
courseId          ObjectId ref Course
dayOfWeek         Number (0=Sunday … 6=Saturday)
startTime         String (HH:MM, 24h)
endTime           String (HH:MM, 24h)
sessionType       String: Lecture | Section | Lab
location          String
groupNumber       String
```

### Materials Models

**MaterialsFolder** — a folder for course materials, mirrored on Google Drive
```
courseInstanceId  ObjectId ref CourseInstance
title             String
driveFolderId     String — Google Drive folder ID
```

**MaterialFile** — a file inside a folder, stored on Google Drive
```
folderId          ObjectId ref MaterialsFolder
title             String
fileType          String (pdf, video, image, etc.)
driveFileId       String — Google Drive file ID
driveWebViewLink  String — shareable Google Drive link
```

**Chapter** — a chapter linked to a course instance and a material file
```
courseInstanceId  ObjectId ref CourseInstance
materialFileId    ObjectId ref MaterialFile
title             String
```

### AI / Quiz Models

**ExamSource** — an uploaded exam file before AI processing
```
courseInstanceId  ObjectId ref CourseInstance
materialFileId    ObjectId ref MaterialFile
examType          Enum: midterm | final | quiz
processed         Boolean
processedAt       Date
```

**ExtractedQuestion** — a question extracted from an exam by AI
```
examSourceId, questionText, options, correctAnswer, explanation, chapter
```

**GeneratedQuestion** — an AI-generated question (not from a real exam)
```
courseInstanceId, questionText, options, correctAnswer, difficulty, chapter
```

**QuizTemplate** — a fixed quiz or mock exam
```
courseInstanceId  ObjectId ref CourseInstance
title             String
isMockExam        Boolean
timeLimitMinutes  Number
questions         Array of { generatedQuestionId, points }
```

**QuizAttempt** — a student's attempt at a quiz
```
userId, quizTemplateId, answers, score, startedAt, completedAt
```

**DoctorInsight** — AI-generated insights about a doctor's exam patterns
```
doctorId, courseInstanceId, insights, generatedAt
```

**WeaknessAnalysis** — AI analysis of a student's weak areas
```
userId, courseInstanceId, weakChapters, recommendations, generatedAt
```

### GPA Models

**GpaRecord** — a historical GPA record per semester
```
userId, semesterId, termGPA, cgpa, creditHours
```

**GpaPlan** — a saved GPA target plan
```
userId, targetCGPA, courses, plan, createdAt
```

**CourseGrade** — individual course grade
```
userId, courseInstanceId, mark, gradePoint, creditHours, isRetake
```

---

## API Routes

### Auth Routes (`/api/auth`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/sync` | Sync Firebase user to MongoDB on login |
| POST | `/setup-profile` | Set student's CGPA and earned credit hours |
| GET | `/get-profile` | Get full student profile |
| GET | `/student-card` | Get student card photo URL |
| POST | `/update-photo` | Update profile photo URL (URL-based) |
| POST | `/update-student-card` | Update student card photo URL (URL-based) |
| POST | `/upload-photo` | Upload profile photo file (multipart, saved to disk) |
| POST | `/upload-student-card` | Upload student card photo file (multipart, saved to disk) |

### GPA Routes (`/api/gpa`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/calculate` | Calculate term GPA + new CGPA from course marks |
| POST | `/plan` | Generate smart target grade plan to reach a CGPA goal |

### Schedule Routes (`/api/schedule`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/my-schedule` | Get authenticated student's full schedule |
| GET | `/:timeTableId` | Get a specific timetable with populated course data |
| POST | `/entry` | Add a new class entry to the student's timetable |
| DELETE | `/session/:sessionId` | Remove a class entry from the schedule |

### AI Routes (`/api/ai`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/generate-schedule` | Upload schedule images → AI extracts sessions → generate conflict-free schedule combinations |

### Materials Routes (`/api/materials`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/folders` | Create a materials folder (also creates Google Drive folder) |
| GET | `/folders/:courseInstanceId` | Get all folders for a course instance |
| DELETE | `/folders/:folderId` | Delete folder + all files from DB and Drive |
| POST | `/files` | Upload a file to a folder (stored on Google Drive) |
| GET | `/files/:folderId` | Get all files in a folder (optional ?fileType filter) |
| DELETE | `/files/:fileId` | Delete a file from DB and Drive |
| POST | `/chapters` | Create a chapter linked to a course instance |
| GET | `/chapters/:courseInstanceId` | Get all chapters for a course instance |
| DELETE | `/chapters/:chapterId` | Delete a chapter |

### Course Routes (`/api/courses`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | Get all courses (sorted by courseCode, limit 100) |

---

## Feature Details

### 1. Smart Schedule Generator (AI-Powered)

**Purpose:** Students photograph their university's official schedule board/PDF and the system automatically generates personalized, conflict-free schedule combinations.

**How it works:**
1. Student uploads one or more images of the university schedule (Arabic RTL table format)
2. Backend sends images to **Google Gemini Flash** with a carefully engineered prompt
3. The prompt instructs Gemini to read the Arabic RTL table column-by-column:
   - Column mapping: Day number → Day name (1=Saturday, 2=Sunday, etc.)
   - Extracts: courseCode, type (Lecture/Section), dayOfWeek, startTime, endTime
4. Raw extracted data is filtered by the student's target course numbers
5. Sessions are grouped by `courseCode_type` (e.g., `CS407_Lecture`, `CS407_Section`)
6. A **backtracking algorithm** generates all valid conflict-free combinations (up to 500 internally)
7. Each valid schedule is **scored** based on human-friendly criteria:
   - Fewer days = better score (−50 per day)
   - Fewer than 3 sessions per day preferred (−150 per extra session)
   - Short gaps (≤2h) are lightly penalized; long gaps (>2h) are heavily penalized
8. Top 3 highest-scoring schedules are returned to the student

**Conflict detection:** Uses `timeHelpers.detectConflict()` which checks for overlapping time slots on the same day.

**Frontend integration:** The student can send `targetCourses` as a JSON array in the form-data body (e.g., `["س402", "402", "CS407"]`). The system extracts only the numeric portion for flexible matching.

### 2. Manual Schedule Builder

**Purpose:** Students can manually build and manage their personal timetable.

**Features:**
- Add class entries with: course (selected from DB), day of week, start/end time, session type (Lecture/Section/Lab), location, group number
- View today's classes on the home screen with time and location
- Full weekly timetable view grouped by day (Saturday → Friday order)
- Delete individual class entries
- Schedule persists in MongoDB per user
- Auto-creates a TimeTable document if none exists

**Mobile UI:** Bottom sheet modal for adding classes, chip selectors for course/day/session type, color-coded accent bars per session type (orange=Lecture, indigo=Section, green=Lab)

### 3. GPA Calculator

**Purpose:** Calculate term GPA and cumulative GPA based on course marks.

**Algorithm:**
- Grade point conversion: `mark/10 - 5` (e.g., 80 → 3.0, 60 → 1.0, below 60 → 0.0)
- Term GPA = Σ(gradePoints × creditHours) / Σ(creditHours)
- Retake courses count double in the divisor (penalizes retakes in CGPA calculation)
- New CGPA = (oldCGPA × oldHours + termGPA × termHours) / (oldHours + termHours)
- GPA scale: 0.0 – 5.0 (Egyptian university standard)

**Grade ratings:** Excellent (≥85), Very Good (≥75), Good (≥65), Pass (≥60), Fail (<60)

**Web UI:** Arabic RTL interface, real-time calculation, add/remove courses, shows total credits, course count, average grade

### 4. Smart GPA Planner (Target Strategy)

**Purpose:** Given a target CGPA, calculate the exact marks a student needs in each upcoming course.

**Algorithm (`calculateSmartTargetStrategy`):**
1. Calculate required term GPA to reach target CGPA given current history
2. If required term GPA > 5.0, return "impossible" with the actual maximum achievable CGPA
3. Fetch each course's `difficulty` rating (1–5) from the database
4. Calculate `easiness = 6 - difficulty` for each course
5. Distribute required marks proportionally: easier courses get higher target marks, harder courses get lower targets
6. Apply beta-scaling to spread marks within a reasonable range (60–95)
7. Fine-tune with a while loop: if total quality points fall short, increment marks on the easiest courses first (credit-hour aware)
8. Return a per-course plan with `targetMark` and `targetRating` (Excellent/Very Good/etc.)

**Validation:** Checks that target CGPA is between 0 and 5.0, that courses exist in DB, falls back to difficulty=3 if course not found.

### 5. Materials Management System

**Purpose:** Centralized storage and organization of course study materials.

**Structure:**
- Materials are organized in **Folders** → **Files** hierarchy
- Each folder belongs to a `CourseInstance`
- Files are stored on **Google Drive** (not local server storage)
- Folders are also mirrored as real Google Drive folders
- **Chapters** provide an additional organizational layer linking material files to course instances

**Admin capabilities:**
- Create/delete folders (auto-creates corresponding Google Drive folder)
- Upload files to folders (uploaded to Google Drive, metadata saved in MongoDB)
- Filter files by type (pdf, video, etc.)
- Delete files (removes from both Google Drive and MongoDB)
- Create/delete chapters

**Google Drive integration:**
- Uses Google Drive API v3 with service account credentials
- Files are uploaded with public read permissions for student access
- Returns `driveWebViewLink` for direct browser/app access

### 6. Student Profile & Identity

**Features:**
- Profile photo upload (compressed, stored on backend server disk, served via `/uploads/`)
- Student ID card photo upload (16:10 aspect ratio, compressed)
- Image compression pipeline: resize → JPEG compress (60% quality) before upload
- Edit academic info: current CGPA and earned credit hours
- View: name, email, user ID, CGPA, credit hours, department
- Sign out

**Photo upload flow (mobile):**
1. Request media library permission
2. Pick image with aspect ratio constraint
3. Compress via `expo-image-manipulator` (resize to 800px width, 60% JPEG quality)
4. Upload as `multipart/form-data` to backend
5. Backend saves to disk, returns public URL
6. URL saved to MongoDB user document

### 7. Home Dashboard (Mobile)

**Features:**
- Time-based greeting (Good morning/afternoon/evening)
- Stats row: total courses, earned credit hours, CGPA
- Student card display with upload/update capability
- Today's schedule filtered by current day of week
- Quick "Add Class" button with bottom sheet modal
- Empty state with friendly message when no classes today

### 8. Admin Panel

**Pages:**
- **Dashboard/Home** — overview stats
- **Users** — manage student accounts, view access status
- **Departments** — manage university departments
- **Doctors** — manage faculty/professors
- **Courses** — manage course catalog
- **Course Instances** — manage specific course offerings per semester
- **Materials** — manage study materials folders and files
- **Chapters** — manage course chapters
- **AI Panel** — monitor and trigger AI jobs (extraction and question generation)

**AI Panel features:**
- View AI job queue with status: Pending, Processing, Completed
- Progress bar for in-progress jobs
- Trigger "Extraction" jobs (extract questions from exam files)
- Trigger "Generation" jobs (generate new questions using AI)
- "Questions to Review" tab for reviewing AI-generated questions before publishing

### 9. Questions & Quiz System (In Development)

**Current state:**
- Mobile: Shows a list of courses with chapter/question counts (static data, UI complete)
- Web: "Coming Soon" placeholder
- Backend models fully designed and ready

**Planned full implementation:**
- Students browse courses → chapters → questions
- AI extracts questions from uploaded exam PDFs (midterm/final/quiz)
- AI generates additional practice questions
- Quiz templates with time limits
- Mock exam mode
- Student attempts tracked with scoring
- Weakness analysis: AI identifies which chapters a student struggles with
- Doctor insights: AI analyzes patterns in a doctor's exam questions

---

## Architecture & Data Flow

```
Firebase Auth
     │
     │ JWT Token
     ▼
Express Backend (auth.middleware.js verifies token)
     │
     ├── User Controller → User_Repo → MongoDB (users)
     ├── Schedule Controller → Schedule_Repo / Sessions_Repo → MongoDB (timetables, entries)
     ├── GPA Controller → gpaCalculator.js → MongoDB (users for history)
     ├── Materials Controller → drive.service.js → Google Drive API
     │                       └──────────────────→ MongoDB (folders, files, chapters)
     └── AI Controller → ai.service.js (Gemini) → scheduleGenerator.js → Response
```

### Repository Pattern
All database operations go through Repository classes:
- `Base_Repo` — generic CRUD (findById, findAll, create, update, delete with soft-delete support)
- `User_Repo` — extends Base_Repo, adds `findByFirebaseUid`
- `Course_Repo` — extends Base_Repo, adds course-specific queries
- `Schedule_Repo` — timetable operations, `findByUserId`, `removeEntry` ($pull)
- `Sessions_Repo` — TimeTableEntry operations

---

## Middleware

### `auth.middleware.js`
- Verifies Firebase JWT token on every protected route
- Attaches decoded user info to `req.user` (uid, email, name, picture)

### `conflict.middleware.js`
- Detects time conflicts before adding schedule entries
- Checks if new entry overlaps with existing entries for the same user

### `schedule.validator.js`
- Joi validation for schedule entry creation
- Validates dayOfWeek (0–6), time format (HH:MM), sessionType enum

### `gpa.validator.js`
- Joi validation for GPA calculation requests
- Validates course marks (0–100), credit hours, required fields

### `upload.middleware.js`
- Multer configuration for file uploads (memory storage for Drive uploads)
- Used for materials file uploads

---

## Current Limitations & Known Issues

1. **Questions web page** is a "Coming Soon" placeholder — not yet implemented
2. **AI Panel** in admin uses static mock data — not yet connected to real backend jobs
3. **Schedule Generator frontend** (web) uses a manual form-based approach (localStorage) rather than the AI image extraction endpoint
4. **Quiz/attempt system** models exist but no API routes or UI implemented yet
5. **Weakness analysis and doctor insights** models exist but no processing logic implemented
6. **Admin authentication** — admin panel uses Firebase Auth but no role enforcement on backend routes yet
7. **GPA records** — `GpaRecord` and `CourseGrade` models exist but no endpoints to save/retrieve historical grades automatically after calculation

---

## Planned Future Features

### Short-term (Next Sprint)
1. **Connect AI Panel to real backend** — implement actual job queue for AI extraction/generation tasks
2. **Questions page (web + mobile)** — browse extracted and generated questions by course/chapter
3. **Quiz taking flow** — timed quiz interface with answer submission and scoring
4. **Save GPA calculation results** — auto-save term GPA to `GpaRecord` after calculation
5. **Admin role enforcement** — protect admin routes with role-based middleware

### Medium-term
6. **Weakness Analysis** — after quiz attempts, AI analyzes wrong answers and identifies weak chapters
7. **Doctor Insights** — AI analyzes patterns across multiple exam sources for a doctor
8. **Mock Exam Mode** — full exam simulation with timer, question shuffling, and detailed results
9. **Notifications** — push notifications for schedule reminders, new materials, quiz availability
10. **Enrollment system** — students enroll in course instances, auto-populate their schedule
11. **GPA History** — view past semester GPAs, CGPA trend chart
12. **Materials search** — search across all uploaded files and chapters

### Long-term
13. **Multi-university support** — expand beyond Cairo University Faculty of Science
14. **Collaborative notes** — students can annotate and share notes on materials
15. **Study groups** — group formation around course instances
16. **Attendance tracking** — mark attendance per session
17. **Grade prediction** — ML model trained on historical data to predict likely grades
18. **Offline mode** — cache schedule and materials for offline access
19. **Dark mode** — full dark theme across all platforms
20. **Arabic language support** — full RTL UI on mobile and web (currently mixed Arabic/English)

---

## Project Conventions

### API Response Format
All endpoints return a consistent JSON structure:
```json
{
  "success": true | false,
  "message": "Human-readable message",
  "data": { ... } | [ ... ]
}
```

### Error Handling
- 400: Validation errors, bad input
- 401: Missing/invalid auth token
- 404: Resource not found
- 500: Internal server error with `error.message`

### Time Format
- All times stored as `HH:MM` strings (24-hour format)
- Day of week stored as numbers: 0=Sunday, 1=Monday, ..., 6=Saturday
- Schedule display order: Saturday (6) → Friday (5)

### GPA Scale
- Egyptian university scale: 0.0 – 5.0
- Passing mark: 60/100
- Grade points: `(mark / 10) - 5`

### Image Storage
- Profile photos and student cards: stored on backend server disk at `/uploads/`
- Served statically at `http://<host>/uploads/<filename>`
- Study materials: stored on Google Drive, accessed via `driveWebViewLink`

### Code Language
- Backend: English (variable names, comments mix Arabic/English)
- Frontend/Mobile: Mix of Arabic UI text and English code
- Admin panel: English UI

---

## Environment Variables (Backend)

```env
PORT=
MONGODB_URI=
GEMINI_API_KEY=
GOOGLE_DRIVE_CREDENTIALS=  # path to service account JSON
FIREBASE_ADMIN_SDK=         # path to firebase-adminsdk.json
```

---

## Development Setup

### Backend
```bash
cd nazamly-backend
npm install
node server.js
```

### Admin Panel
```bash
cd nazamly-admin
npm install
npm run dev
```

### Student Web App
```bash
cd nazamly-front
npm install
npm run dev
```

### Mobile App
```bash
cd nazamly-mobile/my-app
npm install
npx expo start
```
