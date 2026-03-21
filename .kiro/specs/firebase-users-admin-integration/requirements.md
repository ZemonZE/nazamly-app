# Requirements Document

## Introduction

This feature integrates Firebase users stored in MongoDB with the Admin Dashboard Users tab, replacing hardcoded mock data with real user data. Admins will be able to view, search, filter, and manage all Firebase users through the dashboard interface.

## Glossary

- **Admin_Dashboard**: The React-based frontend application for administrators (nazamly-admin)
- **Backend_API**: The Express.js backend server that handles API requests (nazamly-backend)
- **User_Model**: The MongoDB schema representing Firebase users with fields like firebaseUid, email, displayName, accessStatus, and role
- **Admin_Controller**: The backend controller that handles admin-specific operations
- **Users_Page**: The React component at nazamly-admin/src/pages/Users.jsx that displays user management interface
- **Access_Status**: User account status with values: active, pending, or blocked
- **User_Role**: User permission level with values: student or admin

## Requirements

### Requirement 1: Fetch All Users

**User Story:** As an admin, I want to view all Firebase users from the database, so that I can see the complete list of registered users.

#### Acceptance Criteria

1. THE Backend_API SHALL provide an endpoint at GET /api/admin/users
2. WHEN the endpoint is called, THE Backend_API SHALL retrieve all users from the User_Model
3. WHEN users are retrieved, THE Backend_API SHALL return user data including firebaseUid, email, displayName, photoURL, accessStatus, role, and timestamps
4. THE Backend_API SHALL sort users by creation date in descending order
5. WHEN the Users_Page loads, THE Admin_Dashboard SHALL fetch users from the endpoint
6. WHEN user data is received, THE Admin_Dashboard SHALL display users in the table replacing mock data

### Requirement 2: Search and Filter Users

**User Story:** As an admin, I want to search and filter users by name, email, role, and status, so that I can quickly find specific users.

#### Acceptance Criteria

1. THE Backend_API SHALL accept query parameters for search, role, and status filters
2. WHEN a search term is provided, THE Backend_API SHALL filter users by email or displayName containing the search term
3. WHEN a role filter is provided, THE Backend_API SHALL return only users with the specified role
4. WHEN a status filter is provided, THE Backend_API SHALL return only users with the specified accessStatus
5. THE Admin_Dashboard SHALL send filter parameters to the backend when filters are applied
6. THE Users_Page SHALL maintain existing filter UI functionality with real backend data

### Requirement 3: Update User Information

**User Story:** As an admin, I want to update user details including name, email, role, and status, so that I can manage user accounts.

#### Acceptance Criteria

1. THE Backend_API SHALL provide an endpoint at PUT /api/admin/users/:id
2. WHEN the endpoint is called with valid user data, THE Backend_API SHALL update the user in the User_Model
3. THE Backend_API SHALL validate that email is unique before updating
4. WHEN email conflicts with another user, THE Backend_API SHALL return a 409 error with descriptive message
5. THE Backend_API SHALL validate that role is either "student" or "admin"
6. THE Backend_API SHALL validate that accessStatus is "active", "pending", or "blocked"
7. WHEN the admin saves changes in the modal, THE Admin_Dashboard SHALL send updated data to the backend
8. WHEN the update succeeds, THE Admin_Dashboard SHALL refresh the user list and close the modal

### Requirement 4: Change User Access Status

**User Story:** As an admin, I want to ban or unban users, so that I can control user access to the system.

#### Acceptance Criteria

1. THE Backend_API SHALL provide an endpoint at PATCH /api/admin/users/:id/status
2. WHEN the endpoint is called with a new accessStatus, THE Backend_API SHALL update only the accessStatus field
3. THE Backend_API SHALL validate that the new status is "active", "pending", or "blocked"
4. WHEN the admin clicks "Ban User", THE Admin_Dashboard SHALL send a request to set accessStatus to "blocked"
5. WHEN the admin clicks "Unban User", THE Admin_Dashboard SHALL send a request to set accessStatus to "active"
6. WHEN the status update succeeds, THE Admin_Dashboard SHALL update the user display without full page reload

### Requirement 5: Display User Last Login

**User Story:** As an admin, I want to see when users last logged in, so that I can monitor user activity.

#### Acceptance Criteria

1. THE Backend_API SHALL include the updatedAt timestamp in user responses
2. THE Admin_Dashboard SHALL format the updatedAt timestamp as a readable date
3. THE Users_Page SHALL display the formatted last activity date in the "Last Login" column
4. WHEN user data is unavailable, THE Admin_Dashboard SHALL display "Never" or "N/A" for last login

### Requirement 6: Handle API Errors

**User Story:** As an admin, I want to see clear error messages when operations fail, so that I understand what went wrong.

#### Acceptance Criteria

1. WHEN a network error occurs, THE Admin_Dashboard SHALL display a user-friendly error message
2. WHEN the backend returns a 401 error, THE Admin_Dashboard SHALL redirect to the login page
3. WHEN the backend returns a 403 error, THE Admin_Dashboard SHALL display "Insufficient permissions"
4. WHEN the backend returns a 404 error, THE Admin_Dashboard SHALL display "User not found"
5. WHEN the backend returns a 409 error, THE Admin_Dashboard SHALL display the conflict message from the backend
6. WHEN the backend returns a 500 error, THE Admin_Dashboard SHALL display "Server error, please try again"
7. THE Backend_API SHALL log all errors with sufficient context for debugging

### Requirement 7: Secure Admin Operations

**User Story:** As a system administrator, I want user management operations to be secure, so that only authorized admins can modify user data.

#### Acceptance Criteria

1. THE Backend_API SHALL apply authentication middleware to all /api/admin/users endpoints
2. THE Backend_API SHALL apply admin authorization middleware to all /api/admin/users endpoints
3. WHEN a non-authenticated request is made, THE Backend_API SHALL return a 401 error
4. WHEN a non-admin user makes a request, THE Backend_API SHALL return a 403 error
5. THE Backend_API SHALL validate all input data before processing
6. THE Backend_API SHALL sanitize user input to prevent injection attacks

### Requirement 8: Maintain UI Responsiveness

**User Story:** As an admin, I want the interface to remain responsive during data operations, so that I have a smooth user experience.

#### Acceptance Criteria

1. WHEN data is loading, THE Admin_Dashboard SHALL display a loading indicator
2. WHEN an operation is in progress, THE Admin_Dashboard SHALL disable action buttons to prevent duplicate requests
3. WHEN data fetching completes, THE Admin_Dashboard SHALL remove loading indicators
4. THE Admin_Dashboard SHALL implement debouncing for search input with a 300ms delay
5. WHEN filters change, THE Admin_Dashboard SHALL fetch filtered data from the backend

