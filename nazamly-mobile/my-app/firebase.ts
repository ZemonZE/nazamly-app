import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getStorage } from "firebase/storage";
import { GoogleSignin } from '@react-native-google-signin/google-signin';

const firebaseConfig = {
  apiKey: "AIzaSyDTCKBYh4EipHXCHOg5RTYuBCwTJFiP-84",
  authDomain: "nazamly-c242c.firebaseapp.com",
  projectId: "nazamly-c242c",
  storageBucket: "nazamly-c242c.firebasestorage.app",
  messagingSenderId: "229323424819",
  appId: "1:229323424819:web:d76eb25051941b42784f46",
  measurementId: "G-JX83Q6LDVD"
};

export const GOOGLE_WEB_CLIENT_ID = "229323424819-bo0tpt18a47ohjo1dba5k8sgo2tbk2nb.apps.googleusercontent.com";

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

const AWS_API_URL = 'https://nazamlyonline.tech';

export { auth, storage, googleProvider };

export const API_URL = AWS_API_URL;

console.log("=".repeat(60));
console.log("🔧 API Configuration");
console.log("=".repeat(60));
console.log("📍 API_URL:", API_URL);
console.log("=".repeat(60));