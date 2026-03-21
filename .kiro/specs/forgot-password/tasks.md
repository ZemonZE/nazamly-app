# Implementation Plan: Forgot Password

## Overview

Implement the self-service password reset flow in `nazamly-front`. Three existing files are modified and one new component is added. All Firebase interaction is client-side only.

## Tasks

- [ ] 1. Update `Login.jsx` — replace static span with router Link
  - Import `Link` from `react-router-dom`
  - Replace `<span className="forgot-link">Forgot password?</span>` with `<Link to="/forgot-password" className="forgot-link">Forgot password?</Link>`
  - _Requirements: 1.1, 1.2, 1.3_

  - [ ]* 1.1 Write unit test: Login renders `<Link to="/forgot-password">` with class `forgot-link`
    - Assert the element is an anchor pointing to `/forgot-password` and carries the `forgot-link` class
    - _Requirements: 1.1, 1.3_

- [ ] 2. Refactor `AuthLayout` in `App.jsx` to accept children and add `/forgot-password` route
  - Update `AuthLayout` to accept an optional `children` prop; when children are provided render them instead of the Login/Signup toggle
  - Add the `/forgot-password` route: if `user` is truthy redirect to `/dashboard`, otherwise render `<AuthLayout><ForgotPassword /></AuthLayout>`
  - Import `ForgotPassword` (created in task 3) and `Navigate` is already imported
  - _Requirements: 2.1, 2.2, 2.3, 7.1, 7.2, 7.3, 7.4_

  - [ ]* 2.1 Write unit test: unauthenticated user at `/forgot-password` sees ForgotPassword component
    - Mock `onAuthStateChanged` to return null; assert ForgotPassword renders
    - _Requirements: 2.1, 2.2_

  - [ ]* 2.2 Write unit test: authenticated non-admin user at `/forgot-password` is redirected to `/dashboard`
    - Mock `onAuthStateChanged` to return a regular user; assert redirect to `/dashboard`
    - _Requirements: 2.3_

  - [ ]* 2.3 Write unit test: authenticated admin user at `/forgot-password` is redirected to `/dashboard`
    - Mock `onAuthStateChanged` to return a user with `admin: true` claim; assert redirect to `/dashboard`
    - _Requirements: 7.1, 7.4_

- [ ] 3. Create `src/components/ForgotPassword.jsx`
  - Implement controlled `email`, `error`, `success`, `loading` state
  - On submit: validate email (empty/whitespace → "Please enter your email address.", invalid format → "Please enter a valid email address."), then call `sendPasswordResetEmail(auth, email)`
  - On success: clear email, set `success = true`
  - On error: map `auth/network-request-failed` → "Network error. Please check your connection.", all others → "Something went wrong. Please try again."; keep email value
  - While loading: disable both input and submit button
  - Use CSS classes from `Login.css`: `auth-form-panel`, `form-group`, `btn-primary`, `forgot-link`, `error-msg`, `form-footer`
  - Include "Back to login" `<Link to="/login">` in the footer
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 4.1, 4.2, 4.3, 5.1, 5.2, 5.3, 6.1, 6.2, 6.3_

  - [ ]* 3.1 Write unit test: ForgotPassword renders email input, submit button, and back-to-login link
    - Assert root has class `auth-form-panel`; assert input, button labelled "Send Reset Link", and link to `/login` are present
    - _Requirements: 3.1, 3.2, 3.3, 6.1_

  - [ ]* 3.2 Write unit test: loading state disables input and button
    - Trigger submit with valid email while Firebase call is pending; assert both elements have `disabled` attribute
    - _Requirements: 3.6_

  - [ ]* 3.3 Write unit test: success state shows success message and clears email input
    - Mock `sendPasswordResetEmail` to resolve; assert success message appears and input value is empty
    - _Requirements: 4.2, 4.3_

  - [ ]* 3.4 Write unit test: network error shows correct message
    - Mock `sendPasswordResetEmail` to throw `{ code: "auth/network-request-failed" }`; assert "Network error. Please check your connection." is displayed
    - _Requirements: 5.1_

  - [ ]* 3.5 Write unit test: root element has class `auth-form-panel`
    - Assert the outermost rendered element carries the `auth-form-panel` class
    - _Requirements: 6.1_

- [ ] 4. Checkpoint — Ensure all non-optional tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 5. Write property-based tests using fast-check + Vitest
  - Install `fast-check` as a dev dependency if not already present (`npm install -D fast-check`)
  - Create `src/components/__tests__/ForgotPassword.property.test.jsx`

  - [ ]* 5.1 Write property test for Property 1: invalid email rejected without Firebase call
    - **Property 1: Invalid email input is rejected without calling Firebase**
    - Generate: empty string, whitespace-only strings, and strings that are not valid email addresses
    - Assert: `sendPasswordResetEmail` is never called and an error message is displayed
    - Run minimum 100 iterations
    - **Validates: Requirements 3.4, 3.5**

  - [ ]* 5.2 Write property test for Property 2: valid email forwarded to Firebase exactly as entered
    - **Property 2: Valid email is forwarded to Firebase exactly as entered**
    - Generate: `fc.emailAddress()` values
    - Assert: `sendPasswordResetEmail` called exactly once with the exact email string
    - Run minimum 100 iterations
    - **Validates: Requirements 4.1**

  - [ ]* 5.3 Write property test for Property 3: Firebase errors preserve email and show safe message
    - **Property 3: Firebase errors produce safe messages and preserve email input**
    - Generate: `fc.emailAddress()` × `fc.record({ code: fc.string() })` (arbitrary error)
    - Assert: email input retains its value; displayed message is one of the two safe strings
    - Run minimum 100 iterations
    - **Validates: Requirements 5.2, 5.3**

- [ ] 6. Final checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP
- Each task references specific requirements for traceability
- Property tests use `fast-check` with Vitest and React Testing Library
- `AuthLayout` children refactor must not break the existing `/login` route
