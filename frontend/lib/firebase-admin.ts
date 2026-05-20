import * as admin from 'firebase-admin';

const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "demo-project";
const databaseId = process.env.FIRESTORE_DATABASE_ID || "(default)";
const emulatorHost = process.env.FIRESTORE_EMULATOR_HOST;

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

// Aponta para o banco nomeado se FIRESTORE_DATABASE_ID estiver definido
const firestoreInstance = admin.apps.length > 0
  ? admin.firestore()
  : null;

if (firestoreInstance && databaseId !== "(default)") {
  firestoreInstance.settings({ databaseId });
}

export const adminAuth = admin.apps.length > 0 ? admin.auth() : null;
export const adminDb = firestoreInstance;
