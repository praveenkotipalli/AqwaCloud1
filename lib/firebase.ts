import { initializeApp } from 'firebase/app';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { getAnalytics, isSupported } from 'firebase/analytics';
import { getFirestore } from 'firebase/firestore';

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyBsZMSZBFC_lKRNkMWm52kdC9KUUAvCbNs",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "aust2-b8d21.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "aust2-b8d21",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "aust2-b8d21.firebasestorage.app",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "91866779140",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:91866779140:web:f23a3ccfd106287682af51",
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || "G-EBSNTKHEB8"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);

// Ensure auth persistence is enabled
if (typeof window !== 'undefined') {
  // Firebase auth persistence is enabled by default in web apps
  // This ensures the user stays logged in across browser sessions
  console.log('🔐 Firebase Auth initialized with persistence enabled');
}

// Initialize Analytics (only if supported and in browser environment)
let analytics: any = null;
if (typeof window !== 'undefined') {
  isSupported().then(yes => yes ? analytics = getAnalytics(app) : null);
}
export { analytics };

// Check if we're in development mode and connect to emulators if needed
if (process.env.NODE_ENV === 'development') {
  // Uncomment these lines if you want to use Firebase emulators for local development
  // try {
  //   connectAuthEmulator(auth, 'http://localhost:9099');
  // } catch (error) {
  //   console.log('Firebase auth emulator not running, using production services');
  // }
}

export default app;
