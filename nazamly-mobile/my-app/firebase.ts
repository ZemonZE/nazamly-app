import { initializeApp, getApps, getApp } from "firebase/app";
// @ts-ignore: TS doesn't resolve the react-native export condition correctly for getReactNativePersistence
import { initializeAuth, GoogleAuthProvider, getReactNativePersistence, getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
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

// ── OLD BRANCH CODE (commented out — duplicates lines 19-31 above) ──────────
// const app = initializeApp(firebaseConfig);
//
// let auth: ReturnType<typeof initializeAuth>;
//
// if (Platform.OS === "web") {
//   auth = initializeAuth(app, { persistence: browserLocalPersistence });
// } else {
//   const AsyncStorage =
//     require("@react-native-async-storage/async-storage").default;
//   const { getReactNativePersistence } = require("firebase/auth");
//   auth = initializeAuth(app, {
//     persistence: getReactNativePersistence(AsyncStorage),
//   });
// }
//
// export { auth };
// ── END OLD BRANCH CODE ─────────────────────────────────────────────────────

const host = Constants.expoConfig?.hostUri?.split(":")[0] ?? "localhost";
export const API_URL = Platform.OS === 'web' ? 'http://localhost:5000' : 'http://192.168.1.5:5000'; // استبدل ده بالـ IP بتاعك
// Debug: Log API_URL on app start
console.log("=".repeat(60));
console.log("🔧 API Configuration");
console.log("=".repeat(60));
console.log("📍 API_URL:", API_URL);
console.log("📍 Host:", host);
console.log("📍 HostUri:", Constants.expoConfig?.hostUri);
console.log("=".repeat(60));

export const GOOGLE_WEB_CLIENT_ID =
  "638377043762-pqf4qj29sa2jo502f09pipc0g5e9km3g.apps.googleusercontent.com";