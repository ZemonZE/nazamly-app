import { initializeApp, getApps, getApp } from "firebase/app";
// @ts-ignore: TS doesn't resolve the react-native export condition correctly for getReactNativePersistence
import { initializeAuth, GoogleAuthProvider, getReactNativePersistence, getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from 'react-native';
const firebaseConfig = {
  apiKey: "AIzaSyDTCKBYh4EipHXCHOg5RTYuBCwTJFiP-84",
  authDomain: "nazamly-c242c.firebaseapp.com",
  projectId: "nazamly-c242c",
  storageBucket: "nazamly-c242c.firebasestorage.app",
  messagingSenderId: "229323424819",
  appId: "1:229323424819:web:d76eb25051941b42784f46",
  measurementId: "G-JX83Q6LDVD"
};
export const Google_Android_Id="638377043762-n5vj87iuahfahdrvpefreaaahj9c9mel.apps.googleusercontent.com";

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Handle hot-reloading in Expo where initializeAuth throws an error if already initialized.
let authInstance;
try {
  authInstance = initializeAuth(app, { 
    persistence: getReactNativePersistence(AsyncStorage as any)
  });
} catch {
  authInstance = getAuth(app);
}
export const auth = authInstance;
export const storage = getStorage(app);

export const googleProvider = new GoogleAuthProvider();


// 🔥 Dynamic API URL — auto-detects the dev machine's IP from Expo debugger
// Falls back to localhost for web, and Expo's hostUri for native devices
function resolveApiUrl(): string {
  if (Platform.OS === 'web') return 'http://127.0.0.1:5000';

  try {
    // Expo DevTools injects the dev machine's hostname via Constants
    const Constants = require('expo-constants').default;
    const debuggerHost =
      Constants.expoConfig?.hostUri ||   // SDK 55+
      Constants.manifest?.debuggerHost || // Legacy
      null;

    if (debuggerHost) {
      const host = debuggerHost.split(':')[0]; // strip port (e.g., "192.168.1.105:8081" → "192.168.1.105")
      return `http://${host}:5000`;
    }
  } catch (_) {
    // expo-constants not available
  }

  // Ultimate fallback
  return 'http://192.168.1.105:5000';
}

export const API_URL = resolveApiUrl();

console.log("=".repeat(60));
console.log("🔧 API Configuration");
console.log("=".repeat(60));
console.log("📍 API_URL:", API_URL);
console.log("=".repeat(60));

export const GOOGLE_WEB_CLIENT_ID =
  "638377043762-pqf4qj29sa2jo502f09pipc0g5e9km3g.apps.googleusercontent.com";