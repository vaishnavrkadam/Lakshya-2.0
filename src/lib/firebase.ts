import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged,
  type User
} from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  runTransaction, 
  serverTimestamp,
  type DocumentReference,
  type CollectionReference,
  type DocumentData
} from 'firebase/firestore';

const firebaseConfig = {
  apiKey: (import.meta as any).env?.VITE_FIREBASE_API_KEY || "AIzaSyD8eRxPpVUOiU6pV0u3_I6pCFfOaw5UeaA",
  authDomain: (import.meta as any).env?.VITE_FIREBASE_AUTH_DOMAIN || "shaurya-lakshya-event.firebaseapp.com",
  projectId: (import.meta as any).env?.VITE_FIREBASE_PROJECT_ID || "shaurya-lakshya-event",
  storageBucket: (import.meta as any).env?.VITE_FIREBASE_STORAGE_BUCKET || "shaurya-lakshya-event.firebasestorage.app",
  messagingSenderId: (import.meta as any).env?.VITE_FIREBASE_MESSAGING_SENDER_ID || "152287825820",
  appId: (import.meta as any).env?.VITE_FIREBASE_APP_ID || "1:152287825820:web:da682c3a540087b3cd0259",
  measurementId: "G-C26DDLDHB9"
};

export const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

export const APP_ID = (import.meta as any).env?.VITE_FIREBASE_APP_ID_PATH || 'shaurya-lakshya-event';

// Helper to get collection path under artifacts namespace
export function getCollectionPath(collectionName: string): string {
  return `artifacts/${APP_ID}/public/data/${collectionName}`;
}

export function getColRef<T = DocumentData>(collectionName: string): CollectionReference<T> {
  return collection(db, getCollectionPath(collectionName)) as CollectionReference<T>;
}

export function getDocRef<T = DocumentData>(collectionName: string, docId: string): DocumentReference<T> {
  return doc(db, getCollectionPath(collectionName), docId) as DocumentReference<T>;
}

export {
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  type User,
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  runTransaction,
  serverTimestamp
};
