import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getFirestore, Firestore } from 'firebase/firestore';
import { firebaseConfig, isFirebaseConfigured, FirebaseWebConfig } from './firebaseConfig';

let app: FirebaseApp | null = null;
let db: Firestore | null = null;

export function initFirebase(customConfig?: Partial<FirebaseWebConfig>): { app: FirebaseApp; db: Firestore } {
  const activeConfig = {
    ...firebaseConfig,
    ...customConfig,
  };

  if (getApps().length > 0) {
    app = getApp();
  } else {
    app = initializeApp(activeConfig);
  }

  db = getFirestore(app);
  return { app, db };
}

// Automatically initialize if valid config is present
if (isFirebaseConfigured()) {
  try {
    initFirebase();
  } catch (error) {
    console.warn('[Firebase] Error auto-initializing Firebase:', error);
  }
}

export function getDb(): Firestore {
  if (!db) {
    if (!isFirebaseConfigured()) {
      throw new Error(
        'Firebase is not yet configured. Please provide your Firebase Web Configuration in src/lib/firebaseConfig.ts or .env file.'
      );
    }
    const initialized = initFirebase();
    return initialized.db;
  }
  return db;
}

export { app, db };
export default app;
