# Nazamly — نظملي

> **Nazamly** is a full-stack integrated learning management platform built for university students. It covers course management, quiz generation, GPA tracking, timetables, and more.

---

## Project Structure

```
Nazamly App/
├── nazamly-backend/      # Node.js + Express REST API
├── nazamly-front/        # React (Vite) student web app
├── nazamly-admin/        # React (Vite) admin dashboard (UI only)
└── nazamly-mobile/       # React Native (Expo) mobile app
    └── my-app/
```

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Backend** | Node.js, Express 5, Mongoose, Firebase Admin SDK |
| **Database** | MongoDB |
| **Auth** | Firebase Authentication (Email/Password + Google OAuth) |
| **Web Frontend** | React 19, Vite 6 |
| **Admin Dashboard** | React 19, Vite 6 (UI only, no logic yet) |
| **Mobile App** | React Native 0.83, Expo SDK 55, Expo Router |

---

## Services

### nazamly-backend

REST API server running on **port 5000**.

- Firebase Admin for token verification
- MongoDB via Mongoose
- Auth sync endpoint: `POST /api/auth/sync`

**Data models:** User, Course, Chapter, Department, Doctor, Semester, Timetable, Quiz Template, Quiz Attempt, GPA Plan, GPA Record, Materials, Exam Source, Extracted/Generated Questions, Weakness Analysis, Doctor Insight, and more.

```bash
cd nazamly-backend
npm install
# Create .env with MONGO_URI, etc.
node server.js
# or: npx nodemon server.js
```

---

### nazamly-front

Student-facing web app with login/signup, Firebase Auth (email + Google), glassmorphism dark-green UI.

```bash
cd nazamly-front
npm install
npm run dev          # http://localhost:5173
```

---

### nazamly-admin

Admin dashboard — **UI only** (login page). Same design system as the student web app, with an admin badge and shield branding.

```bash
cd nazamly-admin
npm install
npm run dev          # http://localhost:5174
```

---

### nazamly-mobile/my-app

Mobile app for Android/iOS using Expo Go.

- Expo Router for navigation
- Firebase Auth (Email/Password + Google via AuthSession proxy)
- Syncs with backend on login/register

```bash
cd nazamly-mobile/my-app
npm install
npx expo start
```

Scan the QR code with **Expo Go** on your device.

---

## Google OAuth Setup

The app uses the **Expo AuthSession proxy** for Google Sign-In in Expo Go:

- **Web Client ID:** `229323424819-bo0tpt18a47ohjo1dba5k8sgo2tbk2nb.apps.googleusercontent.com`
- **Redirect URI:** `https://auth.expo.io/@ZemonZE/my-app`

Make sure this redirect URI is listed under **Authorized redirect URIs** in [Google Cloud Console → Credentials](https://console.cloud.google.com/apis/credentials).

---

## Environment Variables

### Backend (`.env`)

| Variable | Description |
|----------|-------------|
| `MONGO_URI` | MongoDB connection string |

---

## Running Everything

```bash
# Terminal 1 — Backend
cd nazamly-backend && node server.js

# Terminal 2 — Student Web
cd nazamly-front && npm run dev

# Terminal 3 — Admin Dashboard
cd nazamly-admin && npm run dev

# Terminal 4 — Mobile
cd nazamly-mobile/my-app && npx expo start
```

---

## License

Private project — all rights reserved.
