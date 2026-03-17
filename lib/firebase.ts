import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app";
import { getAuth, Auth } from "firebase/auth";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
};

let app: FirebaseApp | undefined;
let auth: Auth | undefined;

if (typeof window !== "undefined") {
    if (process.env.NEXT_PUBLIC_FIREBASE_API_KEY) {
        app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
        auth = getAuth(app);
    } else {
        console.warn("Firebase client API key not found. Firebase features will be disabled.");
    }
}

export { app, auth };

