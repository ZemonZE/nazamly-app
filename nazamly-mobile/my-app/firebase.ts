import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getStorage } from "firebase/storage";
import { GoogleSignin } from '@react-native-google-signin/google-signin';

const getEnv = (key: string, fallback = ""): string => {
  const value = process.env[key];
  if (!value) {
    console.warn(`[config] Missing ${key}.`);
    return fallback;
  }
  return value;
};

const firebaseConfig = {
  apiKey: getEnv("EXPO_PUBLIC_FIREBASE_API_KEY"),
  authDomain: getEnv("EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN"),
  projectId: getEnv("EXPO_PUBLIC_FIREBASE_PROJECT_ID"),
  storageBucket: getEnv("EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET"),
  messagingSenderId: getEnv("EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID"),
  appId: getEnv("EXPO_PUBLIC_FIREBASE_APP_ID"),
  measurementId: getEnv("EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID")
};

export const GOOGLE_WEB_CLIENT_ID = getEnv("EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID");

// Configure Google Sign In
GoogleSignin.configure({
  webClientId: GOOGLE_WEB_CLIENT_ID,
  offlineAccess: true,
  forceCodeForRefreshToken: true,
});

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

const auth = getAuth(app);
const storage = getStorage(app);
const googleProvider = new GoogleAuthProvider();

const AWS_API_URL = getEnv("EXPO_PUBLIC_API_URL", "https://nazamlyonline.tech");

export { auth, storage, googleProvider };

export const API_URL = AWS_API_URL;

console.log("=".repeat(60));
console.log("🔧 API Configuration");
console.log("=".repeat(60));
console.log("📍 API_URL:", API_URL);
console.log("=".repeat(60));