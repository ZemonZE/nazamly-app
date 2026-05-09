<p align="center">
  <img src="assets/banner.png" alt="Nazamly Banner" width="700" />
</p>

<h1 align="center">Nazamly — نظملي</h1>

<p align="center">
  <strong>Your AI-Powered University Companion</strong><br/>
  Smart scheduling · GPA planning · AI exam generation · Coding practice — all in one platform.
</p>

<p align="center">
  <a href="http://13.60.63.216:5000/api/health">🟢 Live API</a> · 
  <a href="#-live-demo">🌐 Web App</a> · 
  <a href="#-mobile-app">📱 Mobile APK</a> · 
  <a href="#-api-documentation">📚 API Docs</a>
</p>

---

## 🌐 Live Demo

| Platform                    | Link                                                                    |
| --------------------------- | ----------------------------------------------------------------------- |
| **Web App** (Student) | ----                                                                    |
| **API Health Check**  | [http://13.60.63.216:5000/api/health](http://13.60.63.216:5000/api/health) |

## 📱 Mobile App

| Platform                | Download                                                                |
| ----------------------- | ----------------------------------------------------------------------- |
| **Android APK**   | [Download Latest Release](https://github.com/ZemonZE/nazamly-app/releases) |
| **Expo Go (Dev)** | Scan QR from `npx expo start`                                         |

> _iOS coming soon via TestFlight._

---

## ✨ Features

### 🎓 For Students

| Feature                         | Description                                                                                                                               |
| ------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| **📅 Smart Schedule**     | Import your timetable from an image using AI — or build it manually. View weekly sessions with lecture, section, and lab types.          |
| **📊 GPA Planner**        | Calculate term GPA, track CGPA trends over time, set target GPA strategies, and upload transcripts for AI extraction.                     |
| **🧠 AI Exam Generator**  | Generate practice exams tailored to your professor's style using SSE streaming. Select specific lectures and materials as source.         |
| **💻 Coding Problems**    | Solve coding challenges in JavaScript and C++ with real-time code execution via sandboxed Piston runtime. Track progress and submissions. |
| **📖 Course Materials**   | Access lecture notes, section sheets, lab files, and past exams organized per course via Google Drive integration.                        |
| **🏆 Quiz History**       | Review past quiz attempts with scores and track improvement over time.                                                                    |
| **🔐 Email Verification** | Secure access with Firebase email verification flow and student card upload.                                                              |

### 🛡️ For Admins

| Feature                           | Description                                                                                                   |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| **👥 User Management**      | View, update, and manage all registered students. Toggle access status (active/suspended).                    |
| **📚 Course Management**    | Full CRUD for courses, doctors, and course instances (doctor ↔ course linkage per semester).                 |
| **📂 Materials Management** | Upload/manage materials via Google Drive folders. Initialize course folder structure, sync Drive to database. |
| **🧪 Coding Admin**         | Create coding problems with test cases, manage difficulty, and review all student submissions.                |
| **🤖 AI Configuration**     | Configure Gemini AI model settings, trigger professor-style profiling, and upload past exam PDFs.             |

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Clients                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐   │
│  │  React Web   │  │  React Admin │  │  React Native    │   │
│  │  (Vite)      │  │  Dashboard   │  │  (Expo)          │   │
│  └──────┬───────┘  └──────┬───────┘  └────────┬─────────┘   │
│         │                 │                    │             │
└─────────┼─────────────────┼────────────────────┼─────────────┘
          │                 │                    │
          ▼                 ▼                    ▼
┌─────────────────────────────────────────────────────────────┐
│                   Firebase Auth (JWT)                        │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│               Node.js + Express API (:5000)                 │
│  ┌─────────┐ ┌────────┐ ┌──────────┐ ┌──────────────────┐  │
│  │  Auth   │ │  GPA   │ │ Schedule │ │  AI / Questions  │  │
│  │ Routes  │ │ Routes │ │  Routes  │ │     Routes       │  │
│  ├─────────┤ ├────────┤ ├──────────┤ ├──────────────────┤  │
│  │ Coding  │ │ Matls  │ │  Admin   │ │ Student / Quiz   │  │
│  │ Routes  │ │ Routes │ │  Routes  │ │    Routes        │  │
│  └─────────┘ └────────┘ └──────────┘ └──────────────────┘  │
└──────┬────────────┬─────────────┬───────────────────────────┘
       │            │             │
       ▼            ▼             ▼
┌────────────┐ ┌──────────┐ ┌──────────────┐ ┌───────────────┐
│  MongoDB   │ │ Gemini   │ │ Google Drive │ │    Piston     │
│  Atlas     │ │ AI API   │ │   OAuth2     │ │  (Code Exec)  │
└────────────┘ └──────────┘ └──────────────┘ └───────────────┘
```

---

## 📁 Project Structure

```
Nazamly App/
├── nazamly-backend/          # Node.js + Express REST API
├── nazamly-front/            # React (Vite) student web app
├── nazamly-admin/            # React (Vite) admin dashboard
├── nazamly-mobile/           # React Native (Expo) mobile app
│   └── my-app/
├── nazamly-api-collection/   # Bruno API documentation (98 endpoints)
├── docker-compose.yml        # Backend + Piston deployment
└── assets/                   # Project assets
```

---

## 🛠️ Tech Stack

| Layer                    | Technology                                                            |
| ------------------------ | --------------------------------------------------------------------- |
| **Backend**        | Node.js, Express 5, Mongoose, Firebase Admin SDK                      |
| **Database**       | MongoDB Atlas                                                         |
| **Auth**           | Firebase Authentication (Email/Password + Google OAuth)               |
| **AI Engine**      | Google Gemini API (exam generation, schedule parsing, transcript OCR) |
| **Code Execution** | Piston (sandboxed runtime for JS/C++)                                 |
| **File Storage**   | Google Drive API (OAuth2) for course materials                        |
| **Web Frontend**   | React 19, Vite 6, Glassmorphism dark-green UI                         |
| **Mobile App**     | React Native 0.83, Expo SDK 55, Expo Router                           |
| **Deployment**     | Docker, Docker Compose, AWS EC2                                       |
| **API Docs**       | Bruno (98 endpoints documented)                                       |

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** ≥ 18
- **Docker** & **Docker Compose** (for Piston code execution)
- **MongoDB Atlas** account
- **Firebase** project with Authentication enabled
- **Google Cloud** project with Drive API + Gemini API

### 1. Clone the Repository

```bash
git clone https://github.com/ZemonZE/nazamly-app.git
cd nazamly-app
```

### 2. Backend Setup

```bash
cd nazamly-backend
npm install
cp .env.example .env    # Fill in your credentials
node server.js          # Starts on http://localhost:5000
```

### 3. Frontend Setup

```bash
cd nazamly-front
npm install
npm run dev             # Starts on http://localhost:5173
```

### 4. Mobile Setup

```bash
cd nazamly-mobile/my-app
npm install
npx expo start          # Scan QR with Expo Go
```

### 5. Piston (Code Execution Engine)

```bash
# From the project root
docker compose up -d

# Install language runtimes
curl -X POST http://localhost:2000/api/v2/packages \
  -H 'Content-Type: application/json' -d '{"language":"node","version":"18.15.0"}'

curl -X POST http://localhost:2000/api/v2/packages \
  -H 'Content-Type: application/json' -d '{"language":"gcc","version":"10.2.0"}'
```

---

## ☁️ Production Deployment (AWS)

The backend runs on **AWS EC2** using Docker Compose:

```bash
# On the EC2 instance
sudo docker compose up -d

# Verify
curl http://localhost:5000/api/health
curl http://localhost:2000/api/v2/runtimes
```

**Docker Compose** runs two services:

- `nazamly-backend` — Express API on port 5000
- `piston` — Code execution sandbox on port 2000

---

## 📚 API Documentation

Full API documentation is available as a **Bruno collection** with **98 endpoints** across **13 modules**:

| Module           | Endpoints | Description                                                        |
| ---------------- | --------- | ------------------------------------------------------------------ |
| Health Check     | 1         | Server health (no auth)                                            |
| Auth             | 11        | Firebase login, sync, profile, photo uploads, email verification   |
| Students         | 1         | Student onboarding/registration                                    |
| GPA              | 11        | Calculate GPA, target strategy, transcripts, history               |
| Schedule         | 11        | Timetable CRUD, AI schedule parsing, image import                  |
| Courses          | 1         | List all available courses                                         |
| AI               | 1         | Generate schedule from images                                      |
| Questions        | 3         | Professor style analysis, SSE exam stream, archive                 |
| Coding           | 8         | Problems, submit/run code, progress tracking                       |
| Materials        | 9         | Folders, files, chapters CRUD                                      |
| Course Materials | 2         | Student read-only Drive materials                                  |
| Student Quizzes  | 2         | Submit quiz, history                                               |
| Admin            | 37        | Courses, doctors, instances, users, materials, coding, AI settings |

### Using the Bruno Collection

1. Install [Bruno](https://www.usebruno.com/) (free, open-source)
2. Open Collection → select `nazamly-api-collection/` folder
3. Select environment: **AWS Production** or **Local**
4. Run **Auth → Firebase Login** first (auto-saves token for all requests)
5. Test any endpoint!

---

## 🔐 Environment Variables

### Backend (`.env`)

| Variable                 | Description                                             |
| ------------------------ | ------------------------------------------------------- |
| `MONGO_URI`            | MongoDB Atlas connection string                         |
| `GEMINI_API_KEY`       | Google Gemini AI API key                                |
| `GEMINI_MODEL`         | AI model version (default:`gemini-flash-lite-latest`) |
| `DRIVE_CLIENT_ID`      | Google Drive OAuth2 client ID                           |
| `DRIVE_CLIENT_SECRET`  | Google Drive OAuth2 client secret                       |
| `DRIVE_REDIRECT_URI`   | OAuth2 redirect URI                                     |
| `DRIVE_REFRESH_TOKEN`  | OAuth2 refresh token                                    |
| `DRIVE_ROOT_FOLDER_ID` | Root Drive folder for course materials                  |
| `PISTON_BASE_URL`      | Piston code execution API URL                           |
| `CORS_ORIGIN`          | Allowed CORS origins (comma-separated)                  |

### Frontend

| Variable         | Description                         |
| ---------------- | ----------------------------------- |
| `VITE_API_URL` | Backend API URL (overrides default) |

---

## 🤝 Team

Built by **Team Nazamly** — Faculty of Science, Cairo University.

---

## 📄 License

Private project — all rights reserved.
