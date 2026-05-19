import * as admin from 'firebase-admin';

const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "demo-project";

if (!admin.apps.length) {
  try {
    if (process.env.NODE_ENV === "development") {
      // In development, we can initialize with a dummy project ID
      // The emulators will be picked up automatically if FIRESTORE_EMULATOR_HOST is set
      admin.initializeApp({
        projectId: projectId,
      });
      console.log("Firebase Admin initialized in development mode (Emulator ready)");
    } else if (process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: projectId,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        }),
      });
    } else {
      console.warn("Firebase Admin credentials not found. Firebase features might be limited.");
    }
  } catch (error) {
    console.error('Firebase admin initialization error', error);
  }
}

export const adminAuth = admin.apps.length > 0 ? admin.auth() : null;
export const adminDb = admin.apps.length > 0 ? admin.firestore() : null;

