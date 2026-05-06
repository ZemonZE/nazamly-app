# Student Registration API Documentation

> **Audience**: Frontend Web Team
> **Backend Source Files**: [studentProfile.model.js](file:///d:/nazamly-app/nazamly-backend/src/models/studentProfile.model.js), [student.validator.js](file:///d:/nazamly-app/nazamly-backend/src/middlewares/student.validator.js), [student.controller.js](file:///d:/nazamly-app/nazamly-backend/src/controllers/student.controller.js), [studentRegistration.routes.js](file:///d:/nazamly-app/nazamly-backend/src/routes/studentRegistration.routes.js)

---

## 1. Endpoint Overview

| Property | Value |
| --- | --- |
| **HTTP Method** | `POST` |
| **URL Path** | `/api/students/register` |
| **Access** | **Public** — No authentication required |
| **Description** | Registers a new student profile. Validates the payload, checks for duplicate `studentCode`, applies department defaults, persists the profile to MongoDB, and returns the saved document with `registeredCourses` fully populated (resolved Course objects instead of raw ObjectIds). Designed for immediate consumption by the Schedule Generator. |

---

## 2. Headers

| Header | Value | Required |
| --- | --- | --- |
| `Content-Type` | `application/json` | ✅ Yes |
| `Authorization` | — | ❌ No (Public route — no auth middleware applied) |

---

## 3. Request Body Payload

All fields are validated by Joi (`abortEarly: false` — all errors are collected and returned at once).

| Field | Data Type | Required | Validation Rules & Constraints |
| --- | --- | --- | --- |
| `fullName` | `String` | ✅ Required | Trimmed. Cannot be empty. |
| `studentCode` | `String` | ✅ Required | Trimmed. Cannot be empty. Must be **unique** across all student profiles — a duplicate returns `409 Conflict`. |
| `completedHours` | `Number` | ✅ Required | Must be an **integer**. Minimum value: `0`. |
| `cgpa` | `Number` | ✅ Required | Minimum: `0`. Maximum: `5.0`. Accepts decimals (e.g., `3.75`). |
| `academicYear` | `Number` | ⬜ Optional | Must be an **integer** between `1` and `5` (inclusive). |
| `department` | `String` | ⬜ Optional | Trimmed. Cannot be empty if provided. Defaults to `"General"` at the Mongoose model level if omitted. **Special Rule**: If `academicYear` is exactly `1`, the controller **forces** this field to `"General"` regardless of the value sent by the client. |
| `registeredCourses` | `Array of Strings` | ⬜ Optional | Each element must be a valid **24-character hex string** (MongoDB ObjectId format). These must reference existing documents in the `courses` collection. Defaults to `[]` if omitted. |

---

## 4. Example Request

```http
POST /api/students/register HTTP/1.1
Host: localhost:5000
Content-Type: application/json
```

```json
{
  "fullName": "Ahmed Hassan",
  "studentCode": "CS-2024-001",
  "completedHours": 64,
  "cgpa": 3.45,
  "academicYear": 3,
  "department": "Computer Science",
  "registeredCourses": [
    "6651a2f8b3c9d7e4f1234567",
    "6651a2f8b3c9d7e4f1234568"
  ]
}
```

---

## 5. Expected Responses

### ✅ `201 Created` — Success

Returned when the student profile is created successfully. The `registeredCourses` array contains **fully populated Course objects** (not raw ObjectIds), ready for the Schedule Generator.

```json
{
  "success": true,
  "message": "Student registered successfully.",
  "data": {
    "_id": "683a1b2c3d4e5f6a7b8c9d0e",
    "fullName": "Ahmed Hassan",
    "studentCode": "CS-2024-001",
    "completedHours": 64,
    "cgpa": 3.45,
    "academicYear": 3,
    "department": "Computer Science",
    "registeredCourses": [
      {
        "_id": "6651a2f8b3c9d7e4f1234567",
        "courseCode": "CS301",
        "courseName": "Data Structures",
        "level": 2,
        "creditHours": 3,
        "difficulty": 3,
        "department": "General",
        "departments": [],
        "isDeleted": false,
        "deletedAt": null,
        "createdAt": "2026-01-15T10:30:00.000Z",
        "updatedAt": "2026-01-15T10:30:00.000Z"
      },
      {
        "_id": "6651a2f8b3c9d7e4f1234568",
        "courseCode": "CS302",
        "courseName": "Algorithms",
        "level": 2,
        "creditHours": 3,
        "difficulty": 4,
        "department": "General",
        "departments": [],
        "isDeleted": false,
        "deletedAt": null,
        "createdAt": "2026-01-15T10:30:00.000Z",
        "updatedAt": "2026-01-15T10:30:00.000Z"
      }
    ],
    "createdAt": "2026-05-06T14:30:00.000Z",
    "updatedAt": "2026-05-06T14:30:00.000Z",
    "__v": 0
  }
}
```

---

### ❌ `400 Bad Request` — Validation Error

Returned when one or more fields fail Joi validation. The `errors` array contains **all** validation failures (not just the first one).

```json
{
  "success": false,
  "message": "Validation Error: Invalid student data.",
  "errors": [
    "fullName is required",
    "completedHours cannot be negative",
    "cgpa cannot exceed 5.0",
    "Each registeredCourse must be a valid MongoDB ObjectId"
  ]
}
```

---

### ⚠️ `409 Conflict` — Duplicate Student Code

Returned when a student profile with the same `studentCode` already exists in the database.

```json
{
  "success": false,
  "message": "Student with code \"CS-2024-001\" already exists."
}
```

---

### 💥 `500 Internal Server Error` — Unexpected Failure

Returned on any unhandled server-side exception (e.g., database connection issues).

```json
{
  "success": false,
  "message": "Internal server error."
}
```

---

## 6. Frontend Integration Notes

> [!IMPORTANT]
> **Department Override Rule**: If the frontend sends `academicYear: 1`, the backend will **always** override `department` to `"General"`, regardless of what the user selected. Consider disabling the department dropdown in the UI when academic year 1 is selected to avoid user confusion.

> [!TIP]
> **Populated Courses**: The `201` response returns fully populated Course objects inside `registeredCourses`. You can render course names and credit hours directly from this response without making a separate `/api/courses` call.

> [!NOTE]
> **No Auth Required**: This endpoint is public. You do **not** need to attach a Firebase Bearer token to the `Authorization` header for this request.
