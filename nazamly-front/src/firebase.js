import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyDTCKBYh4EipHXCHOg5RTYuBCwTJFiP-84",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "nazamly-c242c.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "nazamly-c242c",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "nazamly-c242c.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "229323424819",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:229323424819:web:949ab594cad1a193784f46",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-32S3LWYTQM",
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const API_URL = import.meta.env.VITE_API_URL || "https://nazamlyonline.tech";
