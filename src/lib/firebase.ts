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
  apiKey: (import.meta as any).env?.VITE_FIREBASE_API_KEY || "AIzaSyALWZz6wR6WI34lp6APtMnk05g9jEdIylY",
  authDomain: (import.meta as any).env?.VITE_FIREBASE_AUTH_DOMAIN || "lakshya-02.firebaseapp.com",
  projectId: (import.meta as any).env?.VITE_FIREBASE_PROJECT_ID || "lakshya-02",
  storageBucket: (import.meta as any).env?.VITE_FIREBASE_STORAGE_BUCKET || "lakshya-02.firebasestorage.app",
  messagingSenderId: (import.meta as any).env?.VITE_FIREBASE_MESSAGING_SENDER_ID || "205566133235",
  appId: (import.meta as any).env?.VITE_FIREBASE_APP_ID || "1:205566133235:web:691e34c3cd87d984980886",
  measurementId: (import.meta as any).env?.VITE_FIREBASE_MEASUREMENT_ID || "G-R96XF11JP2"
};

export const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

export const APP_ID = (import.meta as any).env?.VITE_FIREBASE_APP_ID_PATH || '1:205566133235:web:691e34c3cd87d984980886';

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
