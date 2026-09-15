import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";
import { getFirebaseConfig } from "./firebase-config.functions";

export type FirebaseServices = { app: FirebaseApp; auth: Auth; db: Firestore };

let servicesPromise: Promise<FirebaseServices> | null = null;

export function getFirebase(): Promise<FirebaseServices> {
  if (!servicesPromise) {
    servicesPromise = (async () => {
      const config = await getFirebaseConfig();
      const app = getApps()[0] ?? initializeApp(config);
      return { app, auth: getAuth(app), db: getFirestore(app) };
    })();
  }
  return servicesPromise;
}
