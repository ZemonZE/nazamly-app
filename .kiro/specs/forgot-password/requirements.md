# Requirements Document

## Introduction

The Forgot Password feature adds a self-service password reset flow to the nazamly-front React application (the user-facing app at `nazamly-front/`). When a user cannot remember their password, they can click the existing "Forgot password?" link in the Login component, navigate to a dedicated `/forgot-password` route, enter their email address, and receive a password reset link via Firebase Authentication's built-in email delivery. The flow integrates with the existing `AuthLayout` card, `Login.jsx` component, and Firebase Auth configuration already present in `src/firebase.js`.

## Glossary

- **User**: A registered student or end-user of the Nazamly platform.
- **Admin_User**: A Firebase-authenticated user whose decoded ID token contains the custom claim `admin: true`, as verified by `admin.middleware.js`. Admin users manage the platform via the separate `nazamly-admin` application and do not use the student-facing password reset flow.
- **ForgotPassword_Component**: The React component at `src/components/ForgotPassword.jsx` that renders the password reset request form inside the existing `AuthLayout` card.
- **Firebase_Auth**: The Firebase Authentication service configured in `src/firebase.js`, used to send password reset emails via `sendPasswordResetEmail`.
- **Reset_Email**: The email message sent by Firebase Auth containing a password reset link, delivered to the user's registered email inbox (Gmail, Outlook, etc.).
- **Login_Component**: The existing login form component at `src/components/Login.jsx`.
- **AuthLayout**: The inline layout component defined in `src/App.jsx` that wraps auth-related components inside a card with the Nazamly logo and tagline.

---

## Requirements

### Requirement 1: Wire Up the Forgot Password Link

**User Story:** As a User, I want the "Forgot password?" link on the login form to navigate me to the forgot password page, so that I can initiate a password reset.

#### Acceptance Criteria

1. THE Login_Component SHALL render the "Forgot password?" element as a navigable link to the `/forgot-password` route.
2. WHEN the User clicks the "Forgot password?" link, THE Login_Component SHALL navigate to `/forgot-password` without a full page reload.
3. THE Login_Component SHALL preserve the existing `.forgot-link` CSS class on the element so that visual styling is unchanged.

---

### Requirement 2: Forgot Password Route

**User Story:** As a User, I want the `/forgot-password` path to render the password reset form inside the same card layout as the login page, so that the experience feels consistent.

#### Acceptance Criteria

1. THE App SHALL expose a `/forgot-password` route that renders the ForgotPassword_Component inside the AuthLayout card.
2. WHEN an unauthenticated User navigates to `/forgot-password`, THE App SHALL display the ForgotPassword_Component.
3. WHEN an authenticated User navigates to `/forgot-password`, THE App SHALL redirect the User to `/dashboard`.

---

### Requirement 3: Email Input Form

**User Story:** As a User, I want to enter my email address on the forgot password page, so that I can request a password reset link.

#### Acceptance Criteria

1. THE ForgotPassword_Component SHALL display a single email address input field.
2. THE ForgotPassword_Component SHALL display a submit button labelled "Send Reset Link".
3. THE ForgotPassword_Component SHALL display a "Back to login" link that navigates to `/login`.
4. WHEN the User submits the form with an empty email field, THE ForgotPassword_Component SHALL display a validation error message and SHALL NOT call Firebase_Auth.
5. WHEN the User submits the form with a value that does not match a valid email format, THE ForgotPassword_Component SHALL display a validation error message and SHALL NOT call Firebase_Auth.
6. WHILE the reset request is in progress, THE ForgotPassword_Component SHALL disable the submit button and the email input field to prevent duplicate submissions.

---

### Requirement 4: Send Password Reset Email

**User Story:** As a User, I want Firebase to send a password reset email to my registered address, so that I can regain access to my account via my email provider (Gmail, Outlook, etc.).

#### Acceptance Criteria

1. WHEN the User submits a valid email address, THE ForgotPassword_Component SHALL call `sendPasswordResetEmail` from Firebase_Auth with the provided email address.
2. WHEN Firebase_Auth successfully dispatches the Reset_Email, THE ForgotPassword_Component SHALL display a success message informing the User to check their inbox.
3. WHEN Firebase_Auth successfully dispatches the Reset_Email, THE ForgotPassword_Component SHALL clear the email input field.

---

### Requirement 5: Error Handling

**User Story:** As a User, I want to receive clear feedback when the reset request fails, so that I know what to do next.

#### Acceptance Criteria

1. IF Firebase_Auth returns a network error, THEN THE ForgotPassword_Component SHALL display the message "Network error. Please check your connection."
2. IF Firebase_Auth returns any other error, THEN THE ForgotPassword_Component SHALL display a generic error message "Something went wrong. Please try again." without exposing internal Firebase error codes.
3. WHEN an error is displayed, THE ForgotPassword_Component SHALL keep the email input field populated so the User can retry without re-entering their address.

---

### Requirement 7: Admin User Restriction

**User Story:** As a platform operator, I want admin users to be blocked from the forgot password flow, so that admin credential management stays within the dedicated `nazamly-admin` application.

#### Acceptance Criteria

1. WHEN an Admin_User navigates to `/forgot-password`, THE App SHALL redirect the Admin_User to `/dashboard`.
2. WHILE a Firebase-authenticated session is active and the decoded ID token contains the custom claim `admin: true`, THE App SHALL treat the current user as an Admin_User for the purpose of this route guard.
3. THE `/forgot-password` route SHALL only render the ForgotPassword_Component for non-admin authenticated users and unauthenticated users.
4. IF an Admin_User attempts to access `/forgot-password` directly via URL, THEN THE App SHALL redirect the Admin_User to `/dashboard` without displaying the ForgotPassword_Component.

---

### Requirement 6: Visual Consistency

**User Story:** As a User, I want the forgot password page to look consistent with the existing login page, so that the experience feels cohesive.

#### Acceptance Criteria

1. THE ForgotPassword_Component SHALL use the `.auth-form-panel` CSS class as its root element, matching the layout of the Login_Component.
2. THE ForgotPassword_Component SHALL reuse existing CSS classes from `src/styles/Login.css` (`.form-group`, `.btn-primary`, `.forgot-link`, `.error-msg`, `.form-footer`) for all form elements.
3. THE ForgotPassword_Component SHALL render inside the AuthLayout card so that the Nazamly logo, heading, and tagline are displayed consistently with the login and signup views.
