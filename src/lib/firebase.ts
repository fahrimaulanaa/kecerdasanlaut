import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import {
  getFirestore,
  type Firestore,
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  deleteDoc,
  onSnapshot,
} from "firebase/firestore";

export interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
  measurementId?: string;
}

export const DEFAULT_FIREBASE_CONFIG: FirebaseConfig = {
  apiKey: "AIzaSyAbK9WNaszGmbEd05voAeo-JRCs10ZOCFg",
  authDomain: "kelaitanproject.firebaseapp.com",
  projectId: "kelaitanproject",
  storageBucket: "kelaitanproject.firebasestorage.app",
  messagingSenderId: "259545493573",
  appId: "1:259545493573:web:629d914c186eaa0854b32c",
  measurementId: "G-RCN74PBNVD",
};

export function getActiveFirebaseConfig(): FirebaseConfig {
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

  const envConfig: FirebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || DEFAULT_FIREBASE_CONFIG.apiKey,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || DEFAULT_FIREBASE_CONFIG.authDomain,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || DEFAULT_FIREBASE_CONFIG.projectId,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || DEFAULT_FIREBASE_CONFIG.storageBucket,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || DEFAULT_FIREBASE_CONFIG.messagingSenderId,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || DEFAULT_FIREBASE_CONFIG.appId,
    measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || DEFAULT_FIREBASE_CONFIG.measurementId,
  };

  return envConfig;
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
let firestoreDb: Firestore | null = null;

export function initFirebase(): {
  app: FirebaseApp | null;
  db: Firestore | null;
  isConfigured: boolean;
} {
  const config = getActiveFirebaseConfig();
  if (!config.apiKey || !config.projectId) {
    return { app: null, db: null, isConfigured: false };
  }

  try {
    if (!getApps().length) {
      firebaseApp = initializeApp(config);
    } else {
      firebaseApp = getApp();
    }
    firestoreDb = getFirestore(firebaseApp);
    return { app: firebaseApp, db: firestoreDb, isConfigured: true };
  } catch (error) {
    console.warn("Firebase initialization warning:", error);
    return { app: null, db: null, isConfigured: false };
  }
}

export function getDb(): Firestore | null {
  if (firestoreDb) return firestoreDb;
  const { db } = initFirebase();
  return db;
}

export {
  getFirestore,
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  deleteDoc,
  onSnapshot,
  type Firestore,
};
