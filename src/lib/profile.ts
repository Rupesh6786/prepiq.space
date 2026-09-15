import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";

import { getFirebase } from "./firebase";
import { upsertStoredQuestions, type StoredQuestion } from "./attempts";

/* ------------------------------- profile ------------------------------- */

export type Profile = {
  uid: string;
  name?: string;
  email?: string;
  phone?: string;
  photo?: string; // data URL (image blob encoded)
  testsTaken?: number;
  questionsSolved?: number;
};

export async function getProfile(uid: string): Promise<Profile> {
  const { db } = await getFirebase();
  const snap = await getDoc(doc(db, "users", uid));
  return { uid, ...(snap.exists() ? (snap.data() as Profile) : {}) };
}

export async function saveProfile(uid: string, data: Partial<Profile>) {
  const { db } = await getFirebase();
  await setDoc(doc(db, "users", uid), { ...data, uid, updatedAt: serverTimestamp() }, { merge: true });
}

/** Reads an image file, shrinks it and returns a compact data URL. */
export function imageToDataUrl(file: File, size = 256): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext("2d");
      if (!ctx) return reject(new Error("Could not read the image."));
      const min = Math.min(img.width, img.height);
      ctx.drawImage(img, (img.width - min) / 2, (img.height - min) / 2, min, min, 0, 0, size, size);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL("image/jpeg", 0.8));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("That file isn't a readable image."));
    };
    img.src = url;
  });
}

/* --------------------- questions submitted by learners --------------------- */

export type UserQuestion = StoredQuestion & {
  uid: string;
  userName?: string;
  status?: "pending" | "approved";
  createdAtMs?: number;
};

export async function submitUserQuestion(q: UserQuestion) {
  const { db } = await getFirebase();
  await addDoc(collection(db, "user_questions"), {
    ...q,
    status: "pending",
    createdAtMs: Date.now(),
    createdAt: serverTimestamp(),
  });
}

export async function listUserQuestions(max = 300): Promise<UserQuestion[]> {
  const { db } = await getFirebase();
  const snap = await getDocs(query(collection(db, "user_questions"), limit(max)));
  return snap.docs
    .map((d) => ({ ...(d.data() as UserQuestion), id: d.id }))
    .sort((a, b) => (b.createdAtMs ?? 0) - (a.createdAtMs ?? 0));
}

export async function listMyQuestions(uid: string): Promise<UserQuestion[]> {
  const { db } = await getFirebase();
  const snap = await getDocs(
    query(collection(db, "user_questions"), where("uid", "==", uid), limit(500)),
  );
  return snap.docs
    .map((d) => ({ ...(d.data() as UserQuestion), id: d.id }))
    .sort((a, b) => (b.createdAtMs ?? 0) - (a.createdAtMs ?? 0));
}

export async function approveUserQuestion(item: UserQuestion) {
  const { db } = await getFirebase();
  await upsertStoredQuestions([
    {
      q: item.q,
      options: item.options,
      answer: item.answer,
      difficulty: item.difficulty || "medium",
      explanation: item.explanation ?? "",
      subject: item.subject,
      chapter: item.chapter ?? item.topic,
      topic: item.topic,
      source: "community",
    },
  ]);
  if (item.id) await deleteDoc(doc(db, "user_questions", item.id));
}

export async function rejectUserQuestion(id: string) {
  const { db } = await getFirebase();
  await deleteDoc(doc(db, "user_questions", id));
}

/* ---------------------------- support messages ---------------------------- */

export type SupportMessage = {
  id?: string;
  uid?: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  createdAtMs: number;
  handled?: boolean;
};

export async function sendSupportMessage(m: Omit<SupportMessage, "id" | "createdAtMs">) {
  const { db } = await getFirebase();
  await addDoc(collection(db, "support_messages"), {
    ...m,
    handled: false,
    createdAtMs: Date.now(),
    createdAt: serverTimestamp(),
  });
}

export async function listSupportMessages(max = 300): Promise<SupportMessage[]> {
  const { db } = await getFirebase();
  const snap = await getDocs(query(collection(db, "support_messages"), limit(max)));
  return snap.docs
    .map((d) => ({ ...(d.data() as SupportMessage), id: d.id }))
    .sort((a, b) => (b.createdAtMs ?? 0) - (a.createdAtMs ?? 0));
}

export async function markMessageHandled(id: string, handled: boolean) {
  const { db } = await getFirebase();
  await updateDoc(doc(db, "support_messages", id), { handled });
}

export async function deleteSupportMessage(id: string) {
  const { db } = await getFirebase();
  await deleteDoc(doc(db, "support_messages", id));
}

/* ------------------------- papers (PYQ / mock cards) ------------------------- */

export type PaperFilters = {
  sources?: string[];
  subjects?: string[];
  chapters?: string[];
  topics?: string[];
  difficulties?: string[];
};

export type Paper = {
  id?: string;
  title: string;
  kind: "PYQ" | "MOCK";
  minutes: number;
  total: number;
  filters: PaperFilters;
  createdAtMs: number;
};

export async function listPapers(max = 100): Promise<Paper[]> {
  const { db } = await getFirebase();
  const snap = await getDocs(query(collection(db, "papers"), limit(max)));
  return snap.docs
    .map((d) => ({ ...(d.data() as Paper), id: d.id }))
    .sort((a, b) => (b.createdAtMs ?? 0) - (a.createdAtMs ?? 0));
}

export async function getPaper(id: string): Promise<Paper | null> {
  const { db } = await getFirebase();
  const snap = await getDoc(doc(db, "papers", id));
  return snap.exists() ? { ...(snap.data() as Paper), id: snap.id } : null;
}

export async function savePaper(paper: Paper) {
  const { db } = await getFirebase();
  if (paper.id) {
    const { id, ...rest } = paper;
    await updateDoc(doc(db, "papers", id), { ...rest });
    return id;
  }
  const ref = await addDoc(collection(db, "papers"), { ...paper, createdAtMs: Date.now() });
  return ref.id;
}

export async function deletePaper(id: string) {
  const { db } = await getFirebase();
  await deleteDoc(doc(db, "papers", id));
}
