import { initializeApp, getApps } from 'firebase/app';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import {
  initializeFirestore,
  getFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  connectFirestoreEmulator,
} from 'firebase/firestore';
import { getStorage, connectStorageEmulator } from 'firebase/storage';
import { getFunctions, connectFunctionsEmulator } from 'firebase/functions';

// Build the config from STATIC env reads. Next.js only inlines
// `process.env.NEXT_PUBLIC_*` when the key is a string literal — dynamic
// `process.env[name]` access returns undefined in the browser bundle, which
// previously caused the validation block here to throw before Firebase
// could initialize.
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

const missingKeys = (
  ['apiKey', 'authDomain', 'projectId', 'storageBucket', 'messagingSenderId', 'appId'] as const
).filter((k) => !firebaseConfig[k]);

if (missingKeys.length > 0) {
  const errorMessage = `Missing required Firebase config: ${missingKeys.join(', ')}. Ensure NEXT_PUBLIC_FIREBASE_* variables are set in .env.local at build time.`;
  console.error(errorMessage);
  throw new Error(errorMessage);
}

// Check if Firebase is already initialized
let app;
if (getApps().length === 0) {
  try {
    app = initializeApp(firebaseConfig);
    console.log('Firebase initialized successfully');
  } catch (error) {
    console.error('Failed to initialize Firebase:', error);
    throw error;
  }
} else {
  app = getApps()[0];
  console.log('Using existing Firebase app');
}

// Initialize Firebase services
export const auth = getAuth(app);

// Firestore with persistent IndexedDB cache so writes/reads survive offline.
// initializeFirestore must run before any other Firestore call; reuse getFirestore
// on subsequent calls (e.g., HMR re-import).
let firestoreDb;
try {
  firestoreDb = initializeFirestore(app, {
    // Allow `undefined` field values — Firestore otherwise rejects the entire
    // document. Our domain has many optional fields (team.divisionId,
    // team.startTime, team.finishTime, registrationDeadline, etc.) that are
    // legitimately undefined before being set; without this flag every save
    // failed and retried until the queue dropped it.
    ignoreUndefinedProperties: true,
    localCache: persistentLocalCache({
      // Multi-tab manager so phone + laptop running the app simultaneously
      // share a single source of truth via IndexedDB, with cross-tab leader
      // election. Single-tab manager silently dropped persistence on the
      // non-leader tab, which is a real risk during live events.
      tabManager: persistentMultipleTabManager(),
    }),
  });
} catch {
  // Already initialized (HMR or re-import). Fall back to the existing instance.
  firestoreDb = getFirestore(app);
}
export const db = firestoreDb;

export const storage = getStorage(app);
export const functions = getFunctions(app);

// Only connect to emulators if they're explicitly enabled
if (process.env.NODE_ENV === 'development' && process.env.NEXT_PUBLIC_USE_EMULATORS === 'true') {
  try {
    connectAuthEmulator(auth, 'http://localhost:9099');
    connectFirestoreEmulator(db, 'localhost', 8080);
    connectStorageEmulator(storage, 'localhost', 9199);
    connectFunctionsEmulator(functions, 'localhost', 5001);
    console.log('Connected to Firebase emulators');
  } catch (error) {
    console.log('Emulators not available, using production Firebase');
  }
} else {
  console.log('Using production Firebase services');
}

export default app;

