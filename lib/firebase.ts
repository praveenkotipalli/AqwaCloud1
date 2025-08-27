import { initializeApp } from 'firebase/app';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { getAnalytics, isSupported } from 'firebase/analytics';

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyBsZMSZBFC_lKRNkMWm52kdC9KUUAvCbNs",
  authDomain: "aust2-b8d21.firebaseapp.com",
  projectId: "aust2-b8d21",
  storageBucket: "aust2-b8d21.firebasestorage.app",
  messagingSenderId: "91866779140",
  appId: "1:91866779140:web:f23a3ccfd106287682af51",
  measurementId: "G-EBSNTKHEB8"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const auth = getAuth(app);

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
