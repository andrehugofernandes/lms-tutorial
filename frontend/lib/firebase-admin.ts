import * as admin from 'firebase-admin';

const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "pmjg-apps-hmol";

if (!admin.apps.length) {
  try {
    if (process.env.NODE_ENV === "development") {
      // In development, initialize with projectId only.
      // Emulators are picked up automatically via FIRESTORE_EMULATOR_HOST.
      admin.initializeApp({ projectId });
      console.log("Firebase Admin initialized in development mode (Emulator ready)");
    } else if (process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
      // Explicit service-account key (CI or environments without metadata server)
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        }),
      });
    } else {
      // On Firebase App Hosting / Cloud Run, Application Default Credentials
      // are provisioned automatically via the GCP metadata server.
      admin.initializeApp({
        credential: admin.credential.applicationDefault(),
        projectId,
      });
      console.log("Firebase Admin initialized with Application Default Credentials.");
    }
  } catch (error) {
    console.error('Firebase admin initialization error', error);
  }
}

export const adminAuth = admin.apps.length > 0 ? admin.auth() : null;

// Use the named database to match our Firestore setup (db-lms-project)
const databaseId = process.env.FIRESTORE_DATABASE_ID || "db-lms-project";
let adminDb: admin.firestore.Firestore | null = null;
if (admin.apps.length > 0) {
  adminDb = admin.firestore();
  adminDb.settings({ databaseId });
}
export { adminDb };




