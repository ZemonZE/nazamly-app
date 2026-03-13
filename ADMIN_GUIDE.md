# Nazamly Platform - Admin Management Guide

**Last Updated**: March 12, 2026  
**Status**: ✅ Using Firebase Custom Claims

---

## Overview

This guide covers admin user management using Firebase Custom Claims. This is the recommended approach for role-based access control in Firebase applications.

We've migrated from database-based admin roles to Firebase Custom Claims for better performance, security, and simplicity.

---

## How It Works

### Firebase Custom Claims
Admin status is stored as a custom claim in Firebase Authentication, not in the database.

**Benefits**:
- ✅ No database query needed for authorization
- ✅ Claims included in Firebase ID token
- ✅ Secure (signed by Firebase, cannot be forged)
- ✅ Fast (no DB lookup on every request)
- ✅ Firebase-native solution
- ✅ Works immediately after setting claim (after re-login)
- ✅ Simpler than database-based roles

### Before vs After Migration

**Before (Database Role)**:
- ❌ Required database query on every request
- ❌ Needed to sync Firebase UID with database
- ❌ Temporary UIDs required for pre-creation
- ❌ Extra complexity

**After (Firebase Custom Claims)**:
- ✅ Admin status in Firebase token (no DB query needed)
- ✅ No database dependency for authorization
- ✅ Scalable and performant

### Token Structure
```javascript
{
  "uid": "abc123",
  "email": "admin@example.com",
  "admin": true  // ← Custom claim
}
```

### Authorization Flow
```
1. User logs in → Gets Firebase token
2. Token includes custom claims
3. Backend verifies token signature
4. Backend checks req.user.admin claim
5. Access granted/denied
```

---

## Current Admin Users

| Email | UID | Status |
|-------|-----|--------|
| fakewaleed@nazamly.com | YJCUBzDR3faGMJgKMAT6oo9km772 | ✅ Active |
| mostafaeid@nazamly.com | UcwKIObjKzLHpIL1BWi3Z20ycs82 | ✅ Active |
| amrmahmoud@nazamly.com | DfhsVlvegfYK1G9BZ7GCW7yAAa42 | ✅ Active |
| abdoosama@nazamly.com | 8WZWJPEWNbcHRFBs9sdpVZDF3Mr2 | ✅ Active |
| teamdealer@nazamly.com | 2ygfd3z5lUhWf00UKcTx2aEV2yA2 | ✅ Active |
| aimannage@nazamly.com | eGOX17Y5fGcNnI3eDetpdxNmg6Z2 | ✅ Active |

---

## Admin Management Commands

### Set Admin Claim
```bash
cd nazamly-backend

# By email
node scripts/set-admin-claim.js admin@example.com

# By Firebase UID
node scripts/set-admin-claim.js abc123xyz
```

### Remove Admin Claim
```bash
node scripts/remove-admin-claim.js admin@example.com
```

### List All Users
```bash
node scripts/list-firebase-users.js
```

### Scripts Reference

| Script | Purpose | Usage |
|--------|---------|-------|
| `set-admin-claim.js` | Grant admin access | `node scripts/set-admin-claim.js email@example.com` |
| `remove-admin-claim.js` | Revoke admin access | `node scripts/remove-admin-claim.js email@example.com` |
| `list-firebase-users.js` | View all users with claims | `node scripts/list-firebase-users.js` |

All scripts are in `nazamly-backend/scripts/`

---

## Making Someone Admin

### Step 1: User Signs Up
User must have a Firebase account first.

### Step 2: Set Admin Claim
```bash
node scripts/set-admin-claim.js user@example.com
```

Output:
```
✅ Admin claim set successfully!
   user@example.com is now an admin
   User must re-login to get new token
```

### Step 3: User Re-Logs In
User must log out and log back in to get new token with admin claim.

### Step 4: Done!
User can now access admin dashboard.

---

## Important Notes

### Custom Claims Are Cached
- Claims are included in Firebase ID token
- Tokens are valid for 1 hour
- **Users must re-login** after claim changes
- Or force token refresh programmatically

### Force Token Refresh (Optional)
```javascript
// In frontend
const user = firebase.auth().currentUser;
await user.getIdToken(true); // true = force refresh
```

---

## Testing Admin Access

### Test 1: Admin Can Login
1. Go to `http://localhost:5173`
2. Login with any of the 6 admin emails
3. ✅ Should see admin dashboard

### Test 2: Non-Admin Blocked
1. Login with non-admin Firebase account
2. ✅ Should see "Invalid credentials"

### Test 3: Verify Custom Claim
```bash
node scripts/list-firebase-users.js | grep -A 4 "email@example.com"
```

---

## Troubleshooting

### "Invalid credentials" on login
- ✅ Check user has admin claim: `node scripts/list-firebase-users.js`
- ✅ Ensure user re-logged in after claim was set
- ✅ Verify backend is running
- ✅ Check Firebase Console → Authentication → Users

### User can't see admin claim
- ✅ User must log out and log back in
- ✅ Or force token refresh in code
- ✅ Custom claims are cached in token for 1 hour

### How to revoke admin access
```bash
node scripts/remove-admin-claim.js user@example.com
```
User must re-login to lose admin access.

---

## Security

### Why Custom Claims Are Secure
- ✅ Claims are signed by Firebase (cannot be forged)
- ✅ Backend verifies token signature
- ✅ Claims cannot be modified by client
- ✅ Only Firebase Admin SDK can set claims
- ✅ No database dependency reduces attack surface

### Backend Implementation
```javascript
// In admin.middleware.js
if (!req.user.admin) {
  return res.status(403).json({ message: 'Forbidden' });
}
```

---

## Migration Details

### Code Changes Made

**Backend**:
- ✅ `src/middlewares/admin.middleware.js` - Check `req.user.admin`
- ✅ `src/controllers/user.controller.js` - Return admin claim
- ✅ `src/routes/auth.routes.js` - Simplified authorization

**Frontend**:
- ✅ `nazamly-admin/src/pages/AdminLogin.jsx` - Use `admin` field
- ✅ `nazamly-admin/src/App.jsx` - Check `user.admin` instead of `user.role`

**Scripts**:
- ✅ Created `scripts/set-admin-claim.js`
- ✅ Created `scripts/remove-admin-claim.js`
- ✅ Created `scripts/list-firebase-users.js`

### Old Database Scripts (Deprecated)
- ~~`make-admin.js`~~ - Used database role
- ~~`create-admin.js`~~ - Used database role
- ~~`update-uid.js`~~ - No longer needed
- ~~`batch-create-admins.js`~~ - No longer needed

---

## For More Information

- Firebase Custom Claims: https://firebase.google.com/docs/auth/admin/custom-claims
- Security Guide: See `SECURITY_GUIDE.md`
- Technical Details: See `nazamly-backend/SECURITY_FIXES.md`

---

**Status**: ✅ Production Ready
