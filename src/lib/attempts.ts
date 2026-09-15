import {
  addDoc,
  collection,
  deleteDoc,
  getDocs,
  limit,
  orderBy,
  query,
  where,
  increment,
  doc,
  setDoc,
  updateDoc,
  writeBatch,
  serverTimestamp,
} from "firebase/firestore";

import { getFirebase } from "./firebase";

export type AttemptQuestion = {
  questionId: string;
  subject: string;
  topic: string;
  difficulty: string;
  selected: number | null;
  correctIndex: number;
  correct: boolean;
  seconds: number;
};

export type Attempt = {
  id?: string;
  uid: string;
  userName: string;
  mode: string;
  label: string;
  subject: string;
  topic: string;
  total: number;
  correct: number;
  wrong: number;
  skipped: number;
  scorePercent: number;
  totalSeconds: number;
  avgSeconds: number;
  medianSeconds: number;
  maxSeconds: number;
  minSeconds: number;
  questions: AttemptQuestion[];
  createdAt?: unknown;
  createdAtMs: number;
};

export async function saveAttempt(attempt: Attempt) {
  const { db } = await getFirebase();
  const ref = await addDoc(collection(db, "attempts"), {
    ...attempt,
    createdAt: serverTimestamp(),
  });
  await setDoc(
    doc(db, "users", attempt.uid),
    {
      uid: attempt.uid,
      name: attempt.userName,
      testsTaken: increment(1),
      questionsSolved: increment(attempt.total),
      lastAttemptAt: serverTimestamp(),
    },
    { merge: true },
  );
  return ref.id;
}

export async function listUserAttempts(uid: string, max = 50): Promise<Attempt[]> {
  const { db } = await getFirebase();
  const snap = await getDocs(query(collection(db, "attempts"), where("uid", "==", uid), limit(max)));
  return snap.docs
    .map((d) => ({ ...(d.data() as Attempt), id: d.id }))
    .sort((a, b) => (b.createdAtMs ?? 0) - (a.createdAtMs ?? 0));
}

export async function listAllAttempts(max = 300): Promise<Attempt[]> {
  const { db } = await getFirebase();
  const snap = await getDocs(query(collection(db, "attempts"), limit(max)));
  return snap.docs
    .map((d) => ({ ...(d.data() as Attempt), id: d.id }))
    .sort((a, b) => (b.createdAtMs ?? 0) - (a.createdAtMs ?? 0));
}

export type AppUser = {
  uid: string;
  name?: string;
  email?: string;
  role?: string;
  testsTaken?: number;
  questionsSolved?: number;
};

export async function listUsers(max = 200): Promise<AppUser[]> {
  const { db } = await getFirebase();
  const snap = await getDocs(query(collection(db, "users"), limit(max)));
  return snap.docs.map((d) => ({ ...(d.data() as AppUser), uid: d.id }));
}

export type StoredQuestion = {
  id?: string;
  q: string;
  options: string[];
  answer: number;
  difficulty: string;
  explanation?: string;
  subject: string;
  chapter?: string;
  topic: string;
  source?: string;
};

export async function listStoredQuestions(max = 3000): Promise<StoredQuestion[]> {
  const { db } = await getFirebase();
  const snap = await getDocs(query(collection(db, "questions"), orderBy("topic"), limit(max)));
  return snap.docs.map((d) => ({ ...(d.data() as StoredQuestion), id: d.id }));
}

export async function addStoredQuestions(questions: StoredQuestion[]) {
  await upsertStoredQuestions(questions);
}

/** Stable document id derived from the wording + option set, so repeats collapse. */
export function questionDocId(q: { q: string; options: string[] }): string {
  const norm = (s: string) => s.toLowerCase().replace(/\s+/g, " ").trim();
  const key = `${norm(q.q)}||${[...q.options].map(norm).sort().join("|")}`;
  let h1 = 0x811c9dc5;
  let h2 = 0x01000193;
  for (let i = 0; i < key.length; i++) {
    h1 = Math.imul(h1 ^ key.charCodeAt(i), 16777619) >>> 0;
    h2 = Math.imul(h2 + key.charCodeAt(i), 2246822519) >>> 0;
  }
  return `q_${h1.toString(16).padStart(8, "0")}${h2.toString(16).padStart(8, "0")}`;
}

/** Writes questions using their stable id — duplicates overwrite instead of piling up. */
export async function upsertStoredQuestions(
  questions: StoredQuestion[],
  onProgress?: (done: number, total: number) => void,
): Promise<{ written: number; duplicatesSkipped: number }> {
  const { db } = await getFirebase();
  const seen = new Set<string>();
  const unique: (StoredQuestion & { docId: string })[] = [];
  for (const q of questions) {
    const docId = questionDocId(q);
    if (seen.has(docId)) continue;
    seen.add(docId);
    unique.push({ ...q, docId });
  }

  let done = 0;
  const CHUNK = 400;
  for (let i = 0; i < unique.length; i += CHUNK) {
    const batch = writeBatch(db);
    for (const item of unique.slice(i, i + CHUNK)) {
      const { docId, id: _ignored, ...data } = item;
      batch.set(doc(db, "questions", docId), { ...data, updatedAt: serverTimestamp() }, { merge: true });
    }
    await batch.commit();
    done = Math.min(unique.length, i + CHUNK);
    onProgress?.(done, unique.length);
  }
  return { written: unique.length, duplicatesSkipped: questions.length - unique.length };
}

export async function updateStoredQuestion(id: string, data: Partial<StoredQuestion>) {
  const { db } = await getFirebase();
  const { id: _ignored, ...rest } = data;
  await updateDoc(doc(db, "questions", id), { ...rest, updatedAt: serverTimestamp() });
}

export async function deleteStoredQuestion(id: string) {
  const { db } = await getFirebase();
  await deleteDoc(doc(db, "questions", id));
}

