# Implementation Plan: Firebase Users Admin Integration

## Overview

Replace hardcoded mock data in the Admin Dashboard Users tab with real Firebase user data from MongoDB. This involves adding three backend endpoints and updating the frontend Users page to consume them with proper auth, error handling, loading states, and debounced search.

## Tasks

- [x] 1. Add backend user management endpoints to admin.routes.js
  - Add `GET /users`, `PUT /users/:id`, and `PATCH /users/:id/status` routes to `nazamly-backend/src/routes/admin.routes.js`
  - Wire each route to the corresponding controller method (`adminCtrl.getUsers`, `adminCtrl.updateUser`, `adminCtrl.updateUserStatus`)
  - Routes inherit existing `authMiddleware` and `requireAdmin` middleware applied at router level
  - _Requirements: 1.1, 3.1, 4.1, 7.1, 7.2_

- [x] 2. Implement getUsers controller method
  - [x] 2.1 Add `getUsers` to `nazamly-backend/src/controllers/admin.controller.js`
    - Import the User model at the top of the file
    - Accept optional query params: `search`, `role`, `status`
    - Build a MongoDB query object: if `search` is provided, use `$or` with case-insensitive regex on `email` and `displayName`; apply `role` and `status` filters directly
    - Fetch with `User.find(query).sort({ createdAt: -1 })` and return the array as JSON
    - Return 500 with `{ error: 'Failed to fetch users' }` on exception
    - _Requirements: 1.2, 1.3, 1.4, 2.1, 2.2, 2.3, 2.4, 6.7_

  - [x] 2.2 Write unit tests for getUsers
    - Test no-filter case returns all users sorted by createdAt desc
    - Test `search` param filters by email and displayName (case-insensitive)
    - Test `role` param returns only matching users
    - Test `status` param returns only matching users
    - Test combined filters
    - _Requirements: 1.2, 1.3, 1.4, 2.2, 2.3, 2.4_

- [x] 3. Implement updateUser controller method
  - [x] 3.1 Add `updateUser` to `nazamly-backend/src/controllers/admin.controller.js`
    - Accept `{ email, displayName, role, accessStatus }` from `req.body`
    - Validate `role` is one of `["student", "admin"]`; return 400 if invalid
    - Validate `accessStatus` is one of `["active", "pending", "blocked"]`; return 400 if invalid
    - Check email uniqueness: query for another user with the same email excluding `req.params.id`; return 409 with `{ error: 'Email already in use' }` if conflict
    - Use `User.findByIdAndUpdate(req.params.id, { email, displayName, role, accessStatus }, { new: true, runValidators: true })`
    - Return 404 if user not found, 500 on exception
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 6.7, 7.5, 7.6_

  - [x] 3.2 Write unit tests for updateUser
    - Test successful update returns updated user
    - Test invalid role returns 400
    - Test invalid accessStatus returns 400
    - Test duplicate email returns 409
    - Test unknown id returns 404
    - _Requirements: 3.2, 3.3, 3.4, 3.5, 3.6_

- [x] 4. Implement updateUserStatus controller method
  - [x] 4.1 Add `updateUserStatus` to `nazamly-backend/src/controllers/admin.controller.js`
    - Accept `{ accessStatus }` from `req.body`
    - Validate `accessStatus` is one of `["active", "pending", "blocked"]`; return 400 if invalid
    - Use `User.findByIdAndUpdate(req.params.id, { accessStatus }, { new: true, runValidators: true })`
    - Return 404 if user not found, 500 on exception
    - _Requirements: 4.1, 4.2, 4.3, 6.7, 7.5_

  - [x] 4.2 Write unit tests for updateUserStatus
    - Test valid status update returns updated user
    - Test invalid status returns 400
    - Test unknown id returns 404
    - _Requirements: 4.2, 4.3_

- [x] 5. Checkpoint - Ensure all backend tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. Add fetchWithAuth utility and replace mock data in Users.jsx
  - [x] 6.1 Add `fetchWithAuth` helper inside `nazamly-admin/src/pages/Users.jsx`
    - Import `auth` and `API_URL` from `../firebase`
    - Implement the helper: get `auth.currentUser`, call `user.getIdToken()`, attach `Authorization: Bearer <token>` and `Content-Type: application/json` headers
    - Throw a typed error object `{ status: response.status, message: errorBody.error }` when `!response.ok`
    - _Requirements: 7.1, 7.2, 6.1_

  - [x] 6.2 Replace hardcoded `users` state initializer with empty array and add `loading`/`error` state
    - Change `useState([...mockData])` to `useState([])`
    - Add `const [loading, setLoading] = useState(false)` and `const [error, setError] = useState(null)`
    - _Requirements: 8.1, 8.3_

- [x] 7. Implement fetchUsers with debounced search and filter integration
  - [x] 7.1 Add `fetchUsers` function and `useEffect` to `Users.jsx`
    - Import `useEffect` and `useRef` from React
    - Implement `fetchUsers`: set `loading(true)`, clear `error`, build query string from `searchTerm`/`roleFilter`/`statusFilter`, call `fetchWithAuth('/api/admin/users?' + params)`, map response to `{ id: u._id, name: u.displayName || u.email, email: u.email, role: u.role, status: u.accessStatus, lastLogin: u.updatedAt }`, set users state, handle errors per status code (401 → redirect to `/login`, 403 → "Insufficient permissions", 404 → "User not found", 409 → backend message, 500 → "Server error, please try again", network → "Network error, please check your connection"), always set `loading(false)`
    - Add `useEffect` that calls `fetchUsers()` on mount
    - _Requirements: 1.5, 1.6, 2.5, 2.6, 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 8.1, 8.3_

  - [x] 7.2 Add debounced search effect
    - Add a `useEffect` that sets a 300ms `setTimeout` to call `fetchUsers()` whenever `searchTerm` changes; clear the timeout on cleanup
    - Add a separate `useEffect` that calls `fetchUsers()` immediately when `roleFilter` or `statusFilter` changes
    - Remove the existing client-side `filteredUsers` filter logic; render `users` directly in the table
    - _Requirements: 2.5, 8.4, 8.5_

- [x] 8. Implement updateUser and updateUserStatus API calls in Users.jsx
  - [x] 8.1 Replace `handleSaveChanges` with an async version that calls the backend
    - Call `fetchWithAuth('/api/admin/users/' + editedUser.id, { method: 'PUT', body: JSON.stringify({ email: editedUser.email, displayName: editedUser.name, role: editedUser.role, accessStatus: editedUser.status }) })`
    - On success: call `fetchUsers()` and `handleCloseModal()`
    - On error: set `error` state with the error message
    - Disable the Save button while the request is in-flight using a `saving` state boolean
    - _Requirements: 3.7, 3.8, 6.1–6.6, 8.2_

  - [x] 8.2 Replace `handleBanUser` with an async version that calls the backend
    - Determine `newStatus`: if `editedUser.status === 'blocked'` use `'active'`, else `'blocked'`
    - Call `fetchWithAuth('/api/admin/users/' + editedUser.id + '/status', { method: 'PATCH', body: JSON.stringify({ accessStatus: newStatus }) })`
    - On success: update `users` state in-place (replace the matching user) and update `editedUser` state — no full reload needed
    - On error: set `error` state with the error message
    - Disable the Ban/Unban button while the request is in-flight
    - _Requirements: 4.4, 4.5, 4.6, 6.1–6.6, 8.2_

- [x] 9. Add loading indicator and error display to Users.jsx UI
  - Render a loading spinner/message when `loading === true` (e.g., replace table body with a single row containing "Loading users...")
  - Render an error banner above the table when `error` is non-null, with a dismiss button that clears the error state
  - Format `lastLogin` display: use `new Date(user.lastLogin).toLocaleDateString()` when the value is a valid date string; fall back to "Never" when null/undefined
  - _Requirements: 5.2, 5.3, 5.4, 6.1, 8.1, 8.3_

- [x] 10. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- The `fetchWithAuth` helper reuses `auth` and `API_URL` already exported from `../firebase`
- The existing `authMiddleware` + `requireAdmin` middleware chain on the router covers requirements 7.1–7.4 without any changes
- Client-side filtering is removed in favour of server-side filtering (task 7.2) to keep the backend as the single source of truth
