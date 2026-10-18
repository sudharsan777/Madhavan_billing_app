/**
 * Firebase Web Configuration
 * 
 * You can provide your Firebase credentials in one of two ways:
 * 1. Place them in your `.env` file with `EXPO_PUBLIC_FIREBASE_*` prefix.
 * 2. Or replace the fallback values below with your Firebase web configuration object.
 */

export interface FirebaseWebConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
  measurementId?: string;
}

export const firebaseConfig: FirebaseWebConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY || 'AIzaSyBLlkMpojI608__KG4wykewxkO47gtX7Bc',
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN || 'billingapp-1e564.firebaseapp.com',
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || 'billingapp-1e564',
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET || 'billingapp-1e564.firebasestorage.app',
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '906458093412',
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID || '1:906458093412:web:06b4a9ff2db8e48c204c71',
  measurementId: process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID || undefined,
};

export function isFirebaseConfigured(): boolean {
  return (
    Boolean(firebaseConfig.apiKey) &&
    !firebaseConfig.apiKey.includes('REPLACE_WITH') &&
    Boolean(firebaseConfig.projectId) &&
    !firebaseConfig.projectId.includes('REPLACE_WITH')
  );
}

export default firebaseConfig;
