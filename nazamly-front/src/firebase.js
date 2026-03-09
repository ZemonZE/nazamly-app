import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyDTCKBYh4EipHXCHOg5RTYuBCwTJFiP-84",
  authDomain: "nazamly-c242c.firebaseapp.com",
  projectId: "nazamly-c242c",
  storageBucket: "nazamly-c242c.firebasestorage.app",
  messagingSenderId: "229323424819",
  appId: "1:229323424819:web:949ab594cad1a193784f46",
  measurementId: "G-32S3LWYTQM",
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";
