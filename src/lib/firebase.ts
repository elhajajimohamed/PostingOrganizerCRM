import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// Robust environment variable handling with fallbacks
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || 'AIzaSyADn6pwK0ix_nysJ0fWQn5_QoxNKdnEGUw',
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || 'posting-organizer-crm-new.firebaseapp.com',
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'posting-organizer-crm-new',
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || 'posting-organizer-crm-new.firebasestorage.app',
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '593772237603',
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '1:593772237603:web:9559b82b91f3353cb2f296',
};

// Log configuration (mask sensitive parts)
console.log('Firebase config loaded:', {
  ...firebaseConfig,
  apiKey: firebaseConfig.apiKey ? `${firebaseConfig.apiKey.substring(0, 8)}...` : 'missing',
  projectId: firebaseConfig.projectId || 'missing',
});

// Initialize Firebase
const app = initializeApp(firebaseConfig);
console.log('Firebase app initialized');

// Initialize Firebase services
export const auth = getAuth(app);
console.log('Firebase auth initialized');

export const db = getFirestore(app);
console.log('Firebase Firestore initialized');

export const storage = getStorage(app);
console.log('Firebase storage initialized');

export default app;