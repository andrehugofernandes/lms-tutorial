import * as admin from 'firebase-admin';

const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "demo-project";
const databaseId = process.env.FIRESTORE_DATABASE_ID || "(default)";
const emulatorHost = process.env.FIRESTORE_EMULATOR_HOST;

declare global {
  var globalAdminDb: admin.firestore.Firestore | undefined;
  var globalAdminAuth: admin.auth.Auth | undefined;
}

if (!admin.apps.length) {
  try {
    // Se o emulator está ativo, usa ADC simples (emulator ignora credenciais)
    // Se não, usa ADC real do gcloud (Application Default Credentials)
    admin.initializeApp({
      projectId: projectId,
    });

    if (emulatorHost) {
      console.log(`Firebase Admin: modo emulator (${emulatorHost}) — projeto: ${projectId}`);
    } else {
      console.log(`Firebase Admin: modo produção (ADC) — projeto: ${projectId} — banco: ${databaseId}`);
    }
  } catch (error) {
    console.error('Firebase Admin initialization error:', error);
  }
}

let dbInstance: admin.firestore.Firestore | null = null;
let authInstance: admin.auth.Auth | null = null;

if (admin.apps.length > 0) {
  if (process.env.NODE_ENV !== 'production') {
    if (!globalThis.globalAdminDb) {
      const firestoreInstance = admin.firestore();
      if (databaseId !== "(default)") {
        try {
          firestoreInstance.settings({ databaseId });
        } catch (e) {
          console.warn("Could not set database settings in development:", e);
        }
      }
      globalThis.globalAdminDb = firestoreInstance;
    }
    if (!globalThis.globalAdminAuth) {
      globalThis.globalAdminAuth = admin.auth();
    }
    dbInstance = globalThis.globalAdminDb;
    authInstance = globalThis.globalAdminAuth;
  } else {
    dbInstance = admin.firestore();
    if (databaseId !== "(default)") {
      try {
        dbInstance.settings({ databaseId });
      } catch (e) {
        console.warn("Could not set database settings in production:", e);
      }
    }
    authInstance = admin.auth();
  }
}

export const adminAuth = authInstance;
export const adminDb = dbInstance;
