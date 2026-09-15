import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  updateProfile,
  sendPasswordResetEmail,
  signOut as fbSignOut,
  type User,
} from "firebase/auth";
import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { getFirebase } from "./firebase";
import { isAdminUid } from "./admins";

type AuthValue = {
  user: User | null;
  loading: boolean;
  isAdmin: boolean;
  signIn: (email: string, password: string) => Promise<User>;
  signUp: (name: string, email: string, password: string) => Promise<User>;
  signInWithGoogle: () => Promise<User>;
  resetPassword: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthValue | null>(null);

async function ensureUserDoc(user: User) {
  try {
    const { db } = await getFirebase();
    const ref = doc(db, "users", user.uid);
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      await setDoc(ref, {
        uid: user.uid,
        name: user.displayName ?? "",
        email: user.email ?? "",
        role: isAdminUid(user.uid) ? "admin" : "user",
        testsTaken: 0,
        questionsSolved: 0,
        createdAt: serverTimestamp(),
      });
    }
  } catch (err) {
    console.warn("Could not sync user profile", err);
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsub = () => {};
    let active = true;
    getFirebase()
      .then(({ auth }) => {
        if (!active) return;
        unsub = onAuthStateChanged(auth, (u) => {
          setUser(u);
          setLoading(false);
          if (u) void ensureUserDoc(u);
        });
      })
      .catch((err) => {
        console.error("Firebase init failed", err);
        setLoading(false);
      });
    return () => {
      active = false;
      unsub();
    };
  }, []);

  const value = useMemo<AuthValue>(
    () => ({
      user,
      loading,
      isAdmin: isAdminUid(user?.uid),
      async signIn(email, password) {
        const { auth } = await getFirebase();
        const cred = await signInWithEmailAndPassword(auth, email, password);
        await ensureUserDoc(cred.user);
        return cred.user;
      },
      async signUp(name, email, password) {
        const { auth } = await getFirebase();
        const cred = await createUserWithEmailAndPassword(auth, email, password);
        if (name) await updateProfile(cred.user, { displayName: name });
        await ensureUserDoc(cred.user);
        return cred.user;
      },
      async signInWithGoogle() {
        const { auth } = await getFirebase();
        const provider = new GoogleAuthProvider();
        const cred = await signInWithPopup(auth, provider);
        await ensureUserDoc(cred.user);
        return cred.user;
      },
      async resetPassword(email) {
        const { auth } = await getFirebase();
        await sendPasswordResetEmail(auth, email);
      },
      async signOut() {
        const { auth } = await getFirebase();
        await fbSignOut(auth);
      },
    }),
    [user, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}

export function friendlyAuthError(err: unknown): string {
  const code = (err as { code?: string })?.code ?? "";
  const map: Record<string, string> = {
    "auth/invalid-email": "That email address doesn't look right.",
    "auth/invalid-credential": "Wrong email or password.",
    "auth/user-not-found": "No account found with that email.",
    "auth/wrong-password": "Wrong email or password.",
    "auth/email-already-in-use": "An account already exists with this email.",
    "auth/weak-password": "Password should be at least 6 characters.",
    "auth/popup-closed-by-user": "Google sign-in was cancelled.",
    "auth/unauthorized-domain": "This domain isn't authorised in your Firebase console yet.",
    "auth/operation-not-allowed": "Enable this sign-in method in the Firebase console.",
  };
  return map[code] ?? (err as Error)?.message ?? "Something went wrong. Try again.";
}