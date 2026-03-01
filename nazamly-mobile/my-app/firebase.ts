import { initializeApp } from "firebase/app";
import { initializeAuth, inMemoryPersistence, GoogleAuthProvider } from "firebase/auth";
import Constants from "expo-constants";

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
export const auth = initializeAuth(app, { persistence: inMemoryPersistence });
export const googleProvider = new GoogleAuthProvider();

const host = Constants.expoConfig?.hostUri?.split(":")[0] ?? "localhost";
export const API_URL = `http://${host}:5000`;

export const GOOGLE_WEB_CLIENT_ID =
  "229323424819-bo0tpt18a47ohjo1dba5k8sgo2tbk2nb.apps.googleusercontent.com";
