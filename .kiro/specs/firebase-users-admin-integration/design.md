# Design Document: Firebase Users Admin Integration

## Overview

This feature integrates Firebase users stored in MongoDB with the Admin Dashboard Users tab, replacing hardcoded mock data with real user data from the database. The implementation adds three new backend API endpoints for user management operations and updates the frontend Users page to consume these endpoints.

The system maintains the existing authentication and authorization flow using Firebase Authentication tokens and custom claims for admin verification. All user management operations are protected by both authentication and admin authorization middleware.

Key capabilities:
- Fetch and display all Firebase users from MongoDB
- Search and filter users by name, email, role, and access status
- Update user information (name, email, role, status)
- Ban/unban users by changing their access status
- Display user last activity timestamps
- Handle errors gracefully with user-friendly messages

## Architecture

### System Components

The feature spans both backend and frontend layers:

**Backend (nazamly-backend)**:
- New admin user management endpoints in `admin.routes.js`
- New controller methods in `admin.controller.js`
- Existing User model and User_Repo for data access
- Existing auth and admin middleware for security

**Frontend (nazamly-admin)**:
- Updated Users.jsx component to fetch real data
- API integration using fetch with Firebase auth tokens
- Existing UI components (StatusBadge, PageHeader, Icons)

### Request Flow

```
User Action (Admin Dashboard)
    ↓
Firebase Auth Token (Authorization Header)
    ↓
Backend API Endpoint (/api/admin/users/*)
    ↓
Auth Middleware (verifies Firebase token)
    ↓
Admin Middleware (checks admin custom claim)
    ↓
Admin Controller (business logic)
    ↓
User_Repo (data access layer)
    ↓
MongoDB User Collection
    ↓
Response (JSON)
    ↓
Frontend State Update
    ↓
UI Re-render
```

### Security Architecture

All endpoints follow the existing security pattern:
1. Authentication via Firebase ID token verification
2. Authorization via Firebase custom claims (admin flag)
3. Input validation and sanitization
4. Error handling with appropriate HTTP status codes

## Components and Interfaces

### Backend Components

#### 1. Admin Routes (`admin.routes.js`)

New routes to be added:

```javascript
// GET /api/admin/users - Fetch all users with optional filters
router.get('/users', adminCtrl.getUsers);

// PUT /api/admin/users/:id - Update user information
router.put('/users/:id', adminCtrl.updateUser);

// PATCH /api/admin/users/:id/status - Update user access status
router.patch('/users/:id/status', adminCtrl.updateUserStatus);
```

All routes use existing middleware:
- `authMiddleware` - Verifies Firebase token
- `requireAdmin` - Checks admin custom claim

#### 2. Admin Controller (`admin.controller.js`)

New controller methods:

**getUsers(req, res)**
- Query parameters: `search`, `role`, `status`
- Filters users based on query parameters
- Returns array of user objects sorted by creation date (newest first)
- Response format:
```javascript
[
  {
    _id: "mongoId",
    firebaseUid: "firebaseUid",
    email: "user@example.com",
    displayName: "User Name",
    photoURL: "https://...",
    accessStatus: "active|pending|blocked",
    role: "student|admin",
    createdAt: "2024-01-01T00:00:00.000Z",
    updatedAt: "2024-01-01T00:00:00.000Z"
  }
]
```

**updateUser(req, res)**
- Path parameter: `id` (MongoDB ObjectId)
- Request body: `{ email, displayName, role, accessStatus }`
- Validates email uniqueness
- Validates role enum (student, admin)
- Validates accessStatus enum (active, pending, blocked)
- Returns updated user object
- Error responses:
  - 400: Invalid input data
  - 404: User not found
  - 409: Email already exists

**updateUserStatus(req, res)**
- Path parameter: `id` (MongoDB ObjectId)
- Request body: `{ accessStatus }`
- Validates accessStatus enum
- Updates only the accessStatus field
- Returns updated user object
- Error responses:
  - 400: Invalid status value
  - 404: User not found

#### 3. User Repository (`User_Repo.js`)

Existing methods to be used:
- `findAll()` - Fetch all users
- `findById(id)` - Find user by MongoDB ID
- `update(id, data)` - Update user (with field validation)

Note: The existing User_Repo has ALLOWED_UPDATE_FIELDS restriction that only permits updating `displayName`, `currentCGPA`, `earnedCreditHours`, and `pastSemesters`. For admin operations, we need to update `email`, `role`, and `accessStatus` which are not in the allowed list. The controller will use direct model operations for these admin-specific updates.

#### 4. User Model (`user.model.js`)

Existing schema fields used:
- `firebaseUid` (String, required, unique)
- `email` (String, required, unique)
- `displayName` (String)
- `photoURL` (String)
- `accessStatus` (String, enum: active/pending/blocked, default: pending)
- `role` (String, default: student)
- `createdAt` (Date, auto-generated)
- `updatedAt` (Date, auto-generated)

### Frontend Components

#### 1. Users Page (`Users.jsx`)

Updated functionality:

**State Management**:
```javascript
const [users, setUsers] = useState([]);
const [loading, setLoading] = useState(false);
const [error, setError] = useState(null);
const [searchTerm, setSearchTerm] = useState('');
const [roleFilter, setRoleFilter] = useState('all');
const [statusFilter, setStatusFilter] = useState('all');
const [selectedUser, setSelectedUser] = useState(null);
const [editedUser, setEditedUser] = useState(null);
```

**API Integration Functions**:

`fetchUsers()` - Fetches users from backend
- Constructs query string from filters
- Adds Firebase auth token to headers
- Updates users state on success
- Handles errors appropriately

`updateUser(userId, userData)` - Updates user information
- Sends PUT request to `/api/admin/users/:id`
- Includes auth token
- Refreshes user list on success
- Displays error messages on failure

`updateUserStatus(userId, newStatus)` - Changes user access status
- Sends PATCH request to `/api/admin/users/:id/status`
- Includes auth token
- Updates local state on success
- Displays error messages on failure

**Error Handling**:
- 401: Redirect to login
- 403: Display "Insufficient permissions"
- 404: Display "User not found"
- 409: Display conflict message from backend
- 500: Display "Server error, please try again"
- Network errors: Display "Network error, please check your connection"

**UI Enhancements**:
- Loading spinner during data fetch
- Disabled buttons during operations
- Debounced search input (300ms delay)
- Formatted date display for last login (updatedAt field)

#### 2. API Utility

Helper function for authenticated requests:

```javascript
async function fetchWithAuth(url, options = {}) {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('Not authenticated');
  }
  
  const token = await user.getIdToken();
  
  const response = await fetch(`${API_URL}${url}`, {
    ...options,
    headers: {
      ...options.headers,
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Request failed');
  }
  
  return response.json();
}
```

## Data Models

### User Model Schema

```javascript
{
  _id: ObjectId,                    // MongoDB ID
  firebaseUid: String,              // Firebase Authentication UID (unique)
  email: String,                    // User email (unique)
  displayName: String,              // User display name
  photoURL: String,                 // Profile photo URL
  accessStatus: String,             // "active" | "pending" | "blocked"
  role: String,                     // "student" | "admin"
  cgpa: Number,                     // Current GPA (0-5)
  completedHours: Number,           // Completed credit hours
  termCourses: [{                   // Current term courses
    name: String,
    courseCode: String,
    creditHours: Number
  }],
  createdAt: Date,                  // Account creation timestamp
  updatedAt: Date,                  // Last update timestamp
  isDeleted: Boolean                // Soft delete flag
}
```

### API Request/Response Models

**GET /api/admin/users**

Query Parameters:
```javascript
{
  search?: string,      // Search term for email/displayName
  role?: string,        // Filter by role: "student" | "admin"
  status?: string       // Filter by status: "active" | "pending" | "blocked"
}
```

Response:
```javascript
[
  {
    _id: string,
    firebaseUid: string,
    email: string,
    displayName: string,
    photoURL: string,
    accessStatus: string,
    role: string,
    createdAt: string,
    updatedAt: string
  }
]
```

**PUT /api/admin/users/:id**

Request Body:
```javascript
{
  email: string,           // Required, must be unique
  displayName: string,     // Required
  role: string,            // Required: "student" | "admin"
  accessStatus: string     // Required: "active" | "pending" | "blocked"
}
```

Response:
```javascript
{
  _id: string,
  firebaseUid: string,
  email: string,
  displayName: string,
  photoURL: string,
  accessStatus: string,
  role: string,
  createdAt: string,
  updatedAt: string
}
```

**PATCH /api/admin/users/:id/status**

Request Body:
```javascript
{
  accessStatus: string     // Required: "active" | "pending" | "blocked"
}
```

Response:
```javascript
{
  _id: string,
  firebaseUid: string,
  email: string,
  displayName: string,
  photoURL: string,
  accessStatus: string,
  role: string,
  createdAt: string,
  updatedAt: string
}
```

### Frontend State Models

**User Display Model**:
```javascript
{
  id: string,              // MongoDB _id
  name: string,            // displayName
  email: string,
  role: string,
  status: string,          // accessStatus
  lastLogin: string        // Formatted updatedAt
}
```

