import { initializeApp, getApps, getApp } from "firebase/app";
import { initializeAuth, GoogleAuthProvider, getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { GoogleSignin } from '@react-native-google-signin/google-signin';

const reactNativePersistence = {
  type: 'LOCAL' as const,
  getItem: async (key: string): Promise<string | null> => {
    const value = await AsyncStorage.getItem(key);
    return value;
  },
  setItem: async (key: string, value: string): Promise<void> => {
    await AsyncStorage.setItem(key, value);
  },
  removeItem: async (key: string): Promise<void> => {
    await AsyncStorage.removeItem(key);
  },
  clear: async (): Promise<void> => {
    await AsyncStorage.clear();
  },
};

const firebaseConfig = {
  apiKey: "AIzaSyDTCKBYh4EipHXCHOg5RTYuBCwTJFiP-84",
  authDomain: "nazamly-c242c.firebaseapp.com",
  projectId: "nazamly-c242c",
  storageBucket: "nazamly-c242c.firebasestorage.app",
  messagingSenderId: "229323424819",
  appId: "1:229323424819:web:d76eb25051941b42784f46",
  measurementId: "G-JX83Q6LDVD"
};

export const GOOGLE_WEB_CLIENT_ID = "638377043762-pqf4qj29sa2jo502f09pipc0g5e9km3g.apps.googleusercontent.com";
export const Google_Android_Id = "638377043762-n5vj87iuahfahdrvpefreaaahj9c9mel.apps.googleusercontent.com";

// Configure Google Sign In
GoogleSignin.configure({
  webClientId: GOOGLE_WEB_CLIENT_ID,
  offlineAccess: true,
  forceCodeForRefreshToken: true,
});

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

let authInstance;
try {
  authInstance = initializeAuth(app, {
    persistence: reactNativePersistence
  });
} catch {
  authInstance = getAuth(app);
}
export const auth = authInstance;
export const storage = getStorage(app);

export const googleProvider = new GoogleAuthProvider();

const AWS_API_URL = 'https://nazamlyonline.tech';

function resolveApiUrl(): string {
  return AWS_API_URL;
}

export const API_URL = resolveApiUrl();

console.log("=".repeat(60));
console.log("🔧 API Configuration");
console.log("=".repeat(60));
console.log("📍 API_URL:", API_URL);
console.log("=".repeat(60));