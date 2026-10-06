import { getApp, getApps, initializeApp, type FirebaseApp } from "firebase/app";
import { connectAuthEmulator, getAuth, type Auth } from "firebase/auth";
import {
  clearIndexedDbPersistence,
  connectFirestoreEmulator,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  terminate,
  type Firestore,
} from "firebase/firestore";

/**
 * Firebase client setup (SPEC.md §3, §7). Browser-only: every getter returns
 * null on the server, and when the deployment has no Firebase config — the app
 * then runs exactly as it did before M3, with saved phrases on the device only.
 *
 * These four values are public identifiers, not secrets. Firebase's web "API
 * key" only names the project; what protects user data is `firestore.rules`.
 * CLAUDE.md's "no API keys in client-side code" is about the model provider's
 * key, which stays server-side in `translate.ts`. Each is spelled out in full
 * because Next only inlines `process.env.NEXT_PUBLIC_*` on a literal access.
 */
const config = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

export const firebaseConfigured = Object.values(config).every(Boolean);

/**
 * Local development and verification against the Firebase emulators
 * (`firebase emulators:start --only auth,firestore`). Never set in Vercel.
 */
const useEmulators = process.env.NEXT_PUBLIC_FIREBASE_EMULATORS === "1";

function getFirebaseApp(): FirebaseApp | null {
  if (typeof window === "undefined" || !firebaseConfigured) return null;
  return getApps().length > 0 ? getApp() : initializeApp(config);
}

let auth: Auth | null = null;

export function getFirebaseAuth(): Auth | null {
  if (auth) return auth;
  const app = getFirebaseApp();
  if (!app) return null;
  auth = getAuth(app);
  if (useEmulators) connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
  return auth;
}

let db: Firestore | null = null;

/**
 * Firestore with the persistent offline cache (SPEC.md §7: the
 * `persistentLocalCache` API, not the deprecated `enableIndexedDbPersistence`).
 * Multi-tab so a second open tab shares the cache instead of failing over to
 * memory-only.
 *
 * `ignoreUndefinedProperties` because optional fields (`culturalNote`,
 * `targetLanguage`) are `undefined` when absent, and Firestore rejects an
 * explicit undefined rather than dropping it.
 */
export function getDb(): Firestore | null {
  if (db) return db;
  const app = getFirebaseApp();
  if (!app) return null;
  db = initializeFirestore(app, {
    localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
    ignoreUndefinedProperties: true,
  });
  if (useEmulators) connectFirestoreEmulator(db, "127.0.0.1", 8080);
  return db;
}

/**
 * Called on sign-out: shut Firestore down and delete its on-device cache, so
 * the next person on a shared phone can't read the previous user's vault
 * offline. The next `getDb()` starts a fresh instance.
 *
 * Clearing fails while another tab still holds the cache open. That is left
 * as a logged warning rather than an error the user sees: the sign-out itself
 * succeeded, the rules still block any server read, and the cache is cleared
 * on the next sign-out from a single tab.
 */
export async function clearLocalCache(): Promise<void> {
  // Open an instance even if this page load never touched Firestore: the
  // cache on disk is there regardless, and clearing needs a handle to it.
  const instance = getDb();
  if (!instance) return;
  db = null;
  await terminate(instance);
  try {
    await clearIndexedDbPersistence(instance);
  } catch (error) {
    console.warn("Could not clear the offline cache (another tab may be open).", error);
  }
}
