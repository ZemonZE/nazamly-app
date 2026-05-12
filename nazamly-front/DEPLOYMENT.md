# Deployment Guide

## Current Issue
Your frontend is trying to connect to a backend API, but when deployed to Vercel, it can't reach the backend properly.

## Backend Setup Required

### Option 1: Keep Current Backend (Quick Fix)
If your backend at `http://13.60.63.216:5000` is already running:

1. **Enable CORS** on your backend to allow requests from your Vercel domain
2. **Use HTTPS** - Vercel uses HTTPS, so your backend should too (or configure mixed content)
3. **Set Environment Variable in Vercel**:
   - Go to Vercel Dashboard → Your Project → Settings → Environment Variables
   - Add: `VITE_API_URL` = `http://13.60.63.216:5000`
   - Redeploy

### Option 2: Deploy Backend Properly (Recommended)

Deploy your backend to a proper hosting service:

**Recommended Services:**
- **Railway** - Easy Node.js deployment
- **Render** - Free tier available
- **AWS EC2/ECS** - More control
- **Heroku** - Simple deployment
- **DigitalOcean App Platform**

**Steps:**
1. Deploy your backend to one of these services
2. Get the production URL (e.g., `https://your-api.railway.app`)
3. Update `.env.production` with the new URL
4. Set the environment variable in Vercel:
   - `VITE_API_URL` = `https://your-api.railway.app`
5. Redeploy

## Vercel Deployment Steps

### 1. Configure Environment Variables
In Vercel Dashboard:
- Go to: Project Settings → Environment Variables
- Add these variables (apply to Production, Preview, Development):

**Backend:**
- `VITE_API_URL` = `http://13.60.63.216:5000` (or your backend URL)

**Firebase:**
- `VITE_FIREBASE_API_KEY` = `AIzaSyDTCKBYh4EipHXCHOg5RTYuBCwTJFiP-84`
- `VITE_FIREBASE_AUTH_DOMAIN` = `nazamly-c242c.firebaseapp.com`
- `VITE_FIREBASE_PROJECT_ID` = `nazamly-c242c`
- `VITE_FIREBASE_STORAGE_BUCKET` = `nazamly-c242c.firebasestorage.app`
- `VITE_FIREBASE_MESSAGING_SENDER_ID` = `229323424819`
- `VITE_FIREBASE_APP_ID` = `1:229323424819:web:949ab594cad1a193784f46`
- `VITE_FIREBASE_MEASUREMENT_ID` = `G-32S3LWYTQM`

### 2. Configure Firebase Console (IMPORTANT!)
Before deploying, you MUST add your Vercel domain to Firebase:

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: **nazamly-c242c**
3. Go to **Authentication** → **Settings** → **Authorized domains**
4. Click **Add domain**
5. Add your Vercel domains:
   - `nazamly-front.vercel.app` (your production domain)
   - `nazamly-front-*.vercel.app` (for preview deployments - use wildcard)
   
**Without this step, Firebase authentication will fail on Vercel!**

### 3. Deploy
```bash
# Install Vercel CLI (optional)
npm i -g vercel

# Deploy
vercel --prod
```

Or push to GitHub and connect the repo to Vercel.

### 4. Verify
After deployment:
- Open browser DevTools → Network tab
- Check if API calls are going to the correct URL
- Look for CORS errors

## Common Issues

### CORS Errors
Your backend needs to allow requests from your Vercel domain:
```javascript
// Backend CORS config example
app.use(cors({
  origin: ['https://your-app.vercel.app', 'http://localhost:5173'],
  credentials: true
}));
```

### Mixed Content (HTTP/HTTPS)
If your backend uses HTTP but Vercel uses HTTPS, browsers may block requests.
**Solution:** Use HTTPS for your backend or configure a reverse proxy.

### Environment Variables Not Working
- Make sure variable names start with `VITE_` (Vite requirement)
- Redeploy after adding environment variables
- Check build logs for the correct values

## Testing Locally

```bash
# Test production build locally
npm run build
npm run preview
```

## Files Created
- `vercel.json` - Configures Vercel to handle React Router
- `.env.production` - Production environment variables (committed to git)
- `DEPLOYMENT.md` - This guide

## Next Steps
1. ✅ Deploy your backend or ensure it's accessible
2. ✅ Configure CORS on backend
3. ✅ Set `VITE_API_URL` in Vercel environment variables
4. ✅ Deploy to Vercel
5. ✅ Test all API endpoints
