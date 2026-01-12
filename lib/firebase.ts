// Firebase Client Configuration
import { initializeApp, getApps } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyALDj5jZE8nPzZ4JKOBCBfo_6bq1oUOJEM",
  authDomain: "akgus-e87bc.firebaseapp.com",
  projectId: "akgus-e87bc",
  storageBucket: "akgus-e87bc.firebasestorage.app",
  messagingSenderId: "639723483068",
  appId: "1:639723483068:web:02349735a093ff501885b9",
  measurementId: "G-EQN61Q2NR5"
};

// Initialize Firebase (only once)
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

// Initialize services
export const db = getFirestore(app);
export const storage = getStorage(app);
export const auth = getAuth(app);

export default app;
