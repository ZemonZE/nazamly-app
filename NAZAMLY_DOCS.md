# Nazamly Platform - Documentation

**Last Updated**: March 14, 2026
**Branch**: Mohamed_walid88

---

## Table of Contents
1. [Project Overview](#project-overview)
2. [Security](#security)
3. [Admin Management](#admin-management)
4. [Committed Changes](#committed-changes--branch-mohamed_walid88)

---

## Project Overview

Nazamly is an academic platform with a React admin dashboard (`nazamly-admin`) and a Node.js/Express backend (`nazamly-backend`), using Firebase Authentication and MongoDB.

### Stack
- Frontend: React + Vite (`nazamly-admin`)
- Backend: Node.js + Express (`nazamly-backend`)
- Auth: Firebase Authentication + Custom Claims
- Database: MongoDB (Mongoose)
- File Storage: Google Drive API

---

## Security

### Audit Results: 11/11 Fixed ✅

| Severity | Count | Status |
|----------|-------|--------|
| Critical | 5 | ✅ Fixed |
| High | 6 | ✅ Fixed |
| Overall Risk | 🔴 CRITICAL → | 🟢 LOW |

### Fixes Applied

**Critical**
- SEC-01: AI endpoint authentication enabled (`ai.routes.js`)
- SEC-02: Privilege escalation blocked — role removed from user-updatable fields (`User_Repo.js`)
- SEC-03: Server-side admin authorization via Firebase Custom Claims (`admin.middleware.js`)
- SEC-04: Client-side admin auth replaced with backend verification
- SEC-05: Admin dashboard bypass fixed — custom claims verified on login

**High**
- SEC-06: CORS restricted to configured origins (`app.js`)
- SEC-07: Rate limiting added — 100 global / 20 auth / 5 AI per window (`app.js`)
- SEC-08: Security headers via Helmet (`app.js`)
- SEC-09: File type validation on uploads (`materials.routes.js`)
- SEC-10: Error messages sanitized — no internal details leaked
- SEC-11: NoSQL injection prevented via regex escaping (`Schedule_Repo.js`)

### Security Features

```javascript
// CORS
cors({
  origin: process.env.CORS_ORIGIN.split(','),
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
})

// Admin middleware
if (!req.user.admin) {
  return res.status(403).json({ message: 'Forbidden' });
}
```

### Environment Variables

```env
# nazamly-backend/.env
CORS_ORIGIN=http://localhost:5173,http://localhost:3000
PORT=5000
MONGO_URI=mongodb+srv://...

# nazamly-admin/.env
VITE_API_URL=http://localhost:5000
```

### Remaining Medium/Low Priority Items
- SEC-14: Map Firebase errors to user-friendly messages on frontend
- SEC-15: Add input size/content validation for AI requests
- SEC-16: Restrict Google Drive file sharing to authenticated users
- SEC-17: Remove localStorage token storage on frontend
- SEC-18: Use environment-based API URLs for frontend
- SEC-20: Fix duplicate schema definition in `timeTable.model.js`
- SEC-21: Integrate `npm audit` into CI pipeline
- Ownership checks on IDOR-vulnerable endpoints (materials, schedule delete)

---

## Admin Management

Admin status is managed via **Firebase Custom Claims** — stored in the Firebase token, no database query needed.

### How It Works

```
1. User logs in → Gets Firebase token
2. Token includes { admin: true } custom claim
3. Backend verifies token + checks req.user.admin
4. Access granted/denied
```

### Current Admin Users

| Email | Firebase UID | Status |
|-------|-------------|--------|
| fakewaleed@nazamly.com | YJCUBzDR3faGMJgKMAT6oo9km772 | ✅ Active |
| mostafaeid@nazamly.com | UcwKIObjKzLHpIL1BWi3Z20ycs82 | ✅ Active |
| amrmahmoud@nazamly.com | DfhsVlvegfYK1G9BZ7GCW7yAAa42 | ✅ Active |
| abdoosama@nazamly.com | 8WZWJPEWNbcHRFBs9sdpVZDF3Mr2 | ✅ Active |
| teamdealer@nazamly.com | 2ygfd3z5lUhWf00UKcTx2aEV2yA2 | ✅ Active |
| aimannage@nazamly.com | eGOX17Y5fGcNnI3eDetpdxNmg6Z2 | ✅ Active |

### Admin Scripts

All scripts are in `nazamly-backend/scripts/`

```bash
# Grant admin access
node scripts/set-admin-claim.js user@example.com

# Revoke admin access
node scripts/remove-admin-claim.js user@example.com

# List all Firebase users with claims
node scripts/list-firebase-users.js
```

> After setting/removing a claim, the user must re-login (or force token refresh) to get the updated token.

### Force Token Refresh (Frontend)
```javascript
await firebase.auth().currentUser.getIdToken(true);
```

---

## Committed Changes — Branch `Mohamed_walid88`

### Commit: `feat(users): integrate live user management API`

#### 1. Users Management — Full API Integration (`nazamly-admin/src/pages/Users.jsx`)

Replaced static hardcoded user list with live data from the backend.

- Added `fetchWithAuth` helper — attaches Firebase Bearer token to every request
- Users are now fetched from `GET /api/admin/users` on mount
- Search is debounced (300ms) and triggers a new fetch
- Role and status filters trigger immediate fetches
- `handleSaveChanges` now calls `PUT /api/admin/users/:id`
- `handleBanUser` now calls `PATCH /api/admin/users/:id/status`
- Added `loading` state — shows "Loading users..." in table while fetching
- Added `saving` state — disables Ban/Save buttons during in-flight requests
- Added dismissible error banner for API errors with status-code-specific messages
- `lastLogin` is now formatted from ISO date string to `toLocaleDateString()`

#### 2. Users API — Backend Implementation (`nazamly-backend/src/controllers/admin.controller.js`)

**`getUsers` — `GET /api/admin/users`**
- Fetches all users from Firebase Auth (paginated, handles >1000 users)
- Fetches all MongoDB users and indexes by `firebaseUid` for O(1) lookup
- Merges both sources: Firebase is source of truth for identity, MongoDB for `role`/`accessStatus`
- Supports `search`, `role`, and `status` query filters
- Returns results sorted newest first

**`updateUser` — `PUT /api/admin/users/:id`**
- Accepts `email`, `displayName`, `role`, `accessStatus`
- Validates role and accessStatus against allowed values
- Resolves user by MongoDB `_id` or `firebaseUid`
- Creates MongoDB record if user doesn't have one yet
- Checks for email conflicts (409)
- Syncs `email`, `displayName`, `disabled` flag, and `admin` custom claim to Firebase Auth

**`updateUserStatus` — `PATCH /api/admin/users/:id/status`**
- Updates only `accessStatus` in MongoDB
- Syncs `disabled` flag to Firebase Auth (`blocked` → `disabled: true`)

#### 3. Users Routes (`nazamly-backend/src/routes/admin.routes.js`)

Added three new routes under the admin router (all protected by `requireAdmin` middleware):

```
GET    /api/admin/users
PUT    /api/admin/users/:id
PATCH  /api/admin/users/:id/status
```

---

### Commit: `fix: add auth token to admin API requests in Courses, Materials, and CourseInstances`

All fetch calls to protected `/api/admin/*` routes were missing the `Authorization` header, causing 401/403 responses.

#### 1. Auth Helpers (`nazamly-admin/src/firebase.js`)

- Added `getAdminToken()` — reads the stored token from `localStorage`
- Added `authHeaders(extra?)` — returns headers object with `Content-Type` and `Authorization: Bearer <token>`

#### 2. Courses (`nazamly-admin/src/pages/Courses.jsx`)

Applied `authHeaders()` to:
- `GET /api/admin/courses`
- `POST /api/admin/courses`
- `PUT /api/admin/courses/:id`
- `DELETE /api/admin/courses/:id`

#### 3. Materials (`nazamly-admin/src/pages/Materials.jsx`)

Applied `authHeaders()` to:
- `GET /api/admin/course-materials`
- `GET /api/admin/course-materials/:courseCode/files/:subFolderType`
- `POST /api/admin/course-materials/init`
- `POST /api/admin/course-materials/sync-drive`
- `DELETE /api/admin/course-materials/:courseCode/files/:subFolderType/:fileId`
- File upload uses bare `Authorization` header only (no `Content-Type`) to preserve the browser-set multipart boundary

#### 4. Course Instances (`nazamly-admin/src/pages/CourseInstances.jsx`)

Applied `authHeaders()` to:
- `GET /api/admin/course-instances`
- `GET /api/admin/courses`
- `GET /api/admin/doctors`
- `POST /api/admin/course-instances`
- `PUT /api/admin/course-instances/:id`
- `DELETE /api/admin/course-instances/:id`
- `POST /api/admin/doctors` (inline doctor creation)