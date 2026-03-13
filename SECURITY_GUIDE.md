# Nazamly Platform - Security Guide

**Last Updated**: March 12, 2026  
**Status**: ✅ Production Ready

---

## Overview

This document covers all security implementations in the Nazamly academic platform, including authentication, authorization, and protection mechanisms.

---

## Security Audit Results

### Vulnerabilities Fixed: 11/11 ✅

All Critical and High severity vulnerabilities from the security audit have been resolved.

| Severity | Count | Status |
|----------|-------|--------|
| Critical | 5 | ✅ Fixed |
| High | 6 | ✅ Fixed |
| **Total** | **11** | **✅ All Fixed** |

---

## Security Features Implemented

### 1. Authentication
- ✅ Firebase Authentication required on all protected endpoints
- ✅ JWT token verification on every request
- ✅ No mock/bypass authentication code

**Implementation**: `src/middlewares/auth.middleware.js`

### 2. Authorization (Admin Access)
- ✅ Firebase Custom Claims for admin role
- ✅ Server-side verification of admin claim
- ✅ Admin dashboard verifies role on login and session restoration

**Implementation**: 
- `src/middlewares/admin.middleware.js`
- `src/controllers/user.controller.js` (verifyAdmin)

### 3. CORS Protection
- ✅ Restricted to configured origins only
- ✅ Specific methods and headers allowed
- ✅ Credentials support enabled

**Configuration**:
```javascript
cors({
  origin: process.env.CORS_ORIGIN.split(','),
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
})
```

### 4. Rate Limiting
- ✅ Global: 100 requests per 15 minutes
- ✅ Auth routes: 20 requests per 15 minutes
- ✅ AI routes: 5 requests per minute

**Implementation**: `src/app.js` using `express-rate-limit`

### 5. Security Headers
- ✅ 11+ security headers via Helmet
- ✅ CSP, X-Frame-Options, HSTS, X-Content-Type-Options, etc.

**Implementation**: `app.use(helmet())`

### 6. Input Validation
- ✅ File type validation on uploads (PDF, DOC, images only)
- ✅ NoSQL injection prevention (regex escaping)
- ✅ Error message sanitization

### 7. Privilege Escalation Prevention
- ✅ Role field removed from user-updatable fields
- ✅ Admin status managed via Firebase custom claims only
- ✅ No API endpoint to self-promote to admin

---

## Environment Configuration

### Backend (.env)
```env
# CORS Configuration
CORS_ORIGIN=http://localhost:5173,http://localhost:3000

# Server Port
PORT=5000

# MongoDB
MONGO_URI=mongodb+srv://...

# Firebase Admin SDK
# (Firebase configuration from Firebase Console)
```

### Frontend (.env)
```env
# API URL
VITE_API_URL=http://localhost:5000
```

**Production**:
```env
VITE_API_URL=https://api.nazamly.com
```

---

## Security Testing

### Authentication Tests
```bash
# Should fail (401)
curl -X POST http://localhost:5000/api/ai/generate

# Should work with valid token
curl -X POST http://localhost:5000/api/ai/generate \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Admin Authorization Tests
```bash
# Non-admin should get 403
curl http://localhost:5000/api/admin/courses \
  -H "Authorization: Bearer NON_ADMIN_TOKEN"

# Admin should get 200
curl http://localhost:5000/api/admin/courses \
  -H "Authorization: Bearer ADMIN_TOKEN"
```

### Rate Limiting Tests
```bash
# Should get 429 after 20 requests
for i in {1..25}; do
  curl http://localhost:5000/api/auth/sync
done
```

### File Upload Tests
```bash
# Should reject .exe files
curl -X POST http://localhost:5000/api/materials/files \
  -H "Authorization: Bearer TOKEN" \
  -F "file=@malicious.exe"
```

---

## Security Best Practices

### For Development
1. Never commit `.env` files
2. Use environment variables for all secrets
3. Test with non-admin accounts regularly
4. Run `npm audit` periodically

### For Production
1. Enable HTTPS/TLS
2. Set production CORS origins
3. Monitor failed authentication attempts
4. Set up logging and alerting
5. Regular security audits

---

## Monitoring Recommendations

### Metrics to Track
- Failed authentication attempts
- 403 Forbidden responses (unauthorized access)
- 429 Too Many Requests (rate limit hits)
- Invalid file upload attempts
- Unusual request patterns

### Alerting
- Alert on >10 failed admin logins from same IP
- Alert on >100 rate limit violations per hour
- Alert on successful admin login from new location

---

## Dependencies

### Security-Related Packages
```json
{
  "helmet": "^7.x.x",           // Security headers
  "express-rate-limit": "^7.x.x", // Rate limiting
  "cors": "^2.x.x",              // CORS protection
  "firebase-admin": "^13.x.x"    // Firebase authentication
}
```

### Keeping Dependencies Secure
```bash
# Check for vulnerabilities
npm audit

# Update dependencies
npm update

# Fix vulnerabilities
npm audit fix
```

---

## Files Modified for Security

### Backend
- `src/app.js` - CORS, rate limiting, helmet, error handler
- `src/middlewares/auth.middleware.js` - Authentication
- `src/middlewares/admin.middleware.js` - Admin authorization
- `src/routes/ai.routes.js` - Added authentication
- `src/routes/admin.routes.js` - Added admin middleware
- `src/routes/auth.routes.js` - Added verify-admin endpoint
- `src/routes/materials.routes.js` - File type validation
- `src/Repos/User_Repo.js` - Removed role from allowed fields
- `src/Repos/Schedule_Repo.js` - NoSQL injection fix
- `src/controllers/user.controller.js` - Admin verification
- `src/controllers/materials.controller.js` - Error sanitization
- `src/controllers/Schedule.controller.js` - Error sanitization

### Frontend
- `nazamly-admin/src/pages/AdminLogin.jsx` - Backend role verification
- `nazamly-admin/src/App.jsx` - Session re-verification

---

## Deployment Checklist

### Pre-Deployment
- [ ] Update `CORS_ORIGIN` with production URLs
- [ ] Update `VITE_API_URL` with production API URL
- [ ] Verify at least one admin user exists
- [ ] Run `npm audit` and fix critical issues
- [ ] Test all authentication flows
- [ ] Test admin authorization

### Deployment
- [ ] Deploy backend with environment variables
- [ ] Deploy frontend with production API URL
- [ ] Enable HTTPS/TLS
- [ ] Configure production database

### Post-Deployment
- [ ] Test admin login in production
- [ ] Verify rate limits work
- [ ] Monitor logs for errors
- [ ] Set up alerting

---

## Support

For security concerns or to report vulnerabilities, contact the development team immediately.

**Do not** disclose security vulnerabilities publicly.
