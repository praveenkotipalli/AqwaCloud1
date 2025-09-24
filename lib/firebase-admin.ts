import { initializeApp, getApps, cert, App } from 'firebase-admin/app'
import { getFirestore, Firestore } from 'firebase-admin/firestore'

// Lazy initialization to avoid running at build time
let cachedApp: App | null = null
let cachedDb: Firestore | null = null

function initAdmin(): { app: App; db: Firestore } {
  if (cachedApp && cachedDb) {
    return { app: cachedApp, db: cachedDb }
  }

  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL
  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n')

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error('Missing Firebase Admin credentials (FIREBASE_ADMIN_PROJECT_ID, FIREBASE_ADMIN_CLIENT_EMAIL, FIREBASE_ADMIN_PRIVATE_KEY)')
  }

  const firebaseAdminConfig = {
    credential: cert({
      projectId,
      clientEmail,
      privateKey,
    }),
  }

  const app = getApps().length === 0 ? initializeApp(firebaseAdminConfig) : getApps()[0]
  const db = getFirestore(app)

  cachedApp = app
  cachedDb = db
  return { app, db }
}

export function getAdminDb(): Firestore {
  const { db } = initAdmin()
  return db
}

export default function getAdminApp(): App {
  const { app } = initAdmin()
  return app
}
