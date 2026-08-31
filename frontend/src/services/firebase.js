/**
 * Firebase Configuration & Services.
 * 
 * Initializes Firebase App, Auth (email/password),
 * and Cloud Firestore for user data persistence.
 */

import { initializeApp } from 'firebase/app';
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from 'firebase/auth';
import {
  getFirestore,
  collection,
  doc,
  addDoc,
  getDocs,
  query,
  orderBy,
  limit,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore';

// Firebase config from environment variables
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// Initialize Firebase (only if config is provided)
let app, auth, db;

try {
  if (firebaseConfig.apiKey && firebaseConfig.apiKey !== 'your_api_key_here') {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
    console.log('🔥 Firebase initialized');
  } else {
    console.warn('⚠️ Firebase not configured — using local-only mode');
  }
} catch (error) {
  console.error('Firebase init error:', error);
}

// ─── Auth Functions ─────────────────────────────────────────

export async function registerUser(email, password) {
  if (!auth) throw new Error('Firebase not configured');
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  return cred.user;
}

export async function loginUser(email, password) {
  if (!auth) throw new Error('Firebase not configured');
  const cred = await signInWithEmailAndPassword(auth, email, password);
  return cred.user;
}

export async function logoutUser() {
  if (!auth) return;
  await signOut(auth);
}

export function onAuthChange(callback) {
  if (!auth) {
    callback(null);
    return () => {};
  }
  return onAuthStateChanged(auth, callback);
}

// ─── Firestore Functions ────────────────────────────────────

export async function saveUserEntry(userId, entryData) {
  if (!db) {
    console.warn('Firestore not available — entry not saved');
    return null;
  }
  const entriesRef = collection(db, 'users', userId, 'entries');
  const docRef = await addDoc(entriesRef, {
    ...entryData,
    createdAt: serverTimestamp(),
  });
  return docRef.id;
}

export async function getUserEntries(userId, maxEntries = 20) {
  if (!db) return [];
  const entriesRef = collection(db, 'users', userId, 'entries');
  const q = query(entriesRef, orderBy('createdAt', 'desc'), limit(maxEntries));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

export async function savePrediction(userId, predictionData) {
  if (!db) return null;
  const predsRef = collection(db, 'users', userId, 'predictions');
  const docRef = await addDoc(predsRef, {
    ...predictionData,
    createdAt: serverTimestamp(),
  });
  return docRef.id;
}

export async function saveNotification(userId, notification) {
  if (!db) return null;
  const notifsRef = collection(db, 'users', userId, 'notifications');
  const docRef = await addDoc(notifsRef, {
    ...notification,
    read: false,
    createdAt: serverTimestamp(),
  });
  return docRef.id;
}

export async function getNotifications(userId, maxNotifs = 50) {
  if (!db) return [];
  const notifsRef = collection(db, 'users', userId, 'notifications');
  const q = query(notifsRef, orderBy('createdAt', 'desc'), limit(maxNotifs));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

export { auth, db };
