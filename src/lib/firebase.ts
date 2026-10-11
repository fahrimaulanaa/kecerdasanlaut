import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import {
  getAuth,
  type Auth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  sendPasswordResetEmail,
  onAuthStateChanged,
  type User,
} from "firebase/auth";

export interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
}

export function getActiveFirebaseConfig(): FirebaseConfig | null {
  if (typeof window !== "undefined") {
    const localConfig = localStorage.getItem("oceanai_firebase_config");
    if (localConfig) {
      try {
        const parsed = JSON.parse(localConfig);
        if (parsed.apiKey && parsed.projectId) {
          return parsed;
        }
      } catch (e) {
        console.error("Failed to parse custom firebase config from localStorage", e);
      }
    }
  }

  // Check process.env
  const envConfig: FirebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "",
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "",
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "",
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "",
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "",
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "",
  };

  if (envConfig.apiKey && envConfig.projectId) {
    return envConfig;
  }

  return null;
}

export function saveFirebaseConfig(config: FirebaseConfig) {
  if (typeof window !== "undefined") {
    localStorage.setItem("oceanai_firebase_config", JSON.stringify(config));
  }
}

export function clearFirebaseConfig() {
  if (typeof window !== "undefined") {
    localStorage.removeItem("oceanai_firebase_config");
  }
}

let firebaseApp: FirebaseApp | null = null;
let firebaseAuth: Auth | null = null;

export function initFirebase(): { app: FirebaseApp | null; auth: Auth | null; isConfigured: boolean } {
  const config = getActiveFirebaseConfig();
  if (!config) {
    return { app: null, auth: null, isConfigured: false };
  }

  try {
    if (!getApps().length) {
      firebaseApp = initializeApp(config);
    } else {
      firebaseApp = getApp();
    }
    firebaseAuth = getAuth(firebaseApp);
    return { app: firebaseApp, auth: firebaseAuth, isConfigured: true };
  } catch (error) {
    console.warn("Firebase initialization warning:", error);
    return { app: null, auth: null, isConfigured: false };
  }
}

export {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  firebaseSignOut,
  sendPasswordResetEmail,
  onAuthStateChanged,
  type User,
};
