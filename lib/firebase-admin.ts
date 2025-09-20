import { initializeApp, getApps, cert } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'

// Initialize Firebase Admin SDK
const firebaseAdminConfig = {
  credential: cert({
    projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
    clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  }),
}

// Initialize the app if it doesn't exist
const adminApp = getApps().length === 0 ? initializeApp(firebaseAdminConfig) : getApps()[0]

// Get Firestore instance
export const adminDb = getFirestore(adminApp)

export default adminApp
