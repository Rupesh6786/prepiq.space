import { SUBJECT_MARKS } from "@/data/syllabus";

export type Difficulty = "easy" | "medium" | "hard";

export type RawQuestion = {
  q: string;
  options: string[];
  answer: number;
  difficulty?: Difficulty;
  explanation?: string;
};

export type TopicBank = {
  id: string;
  subject: string;
  group: string;
  chapter: string;
  topic: string;
  weightage: string;
  priority: string;
  questions: RawQuestion[];
};

export type Question = RawQuestion & {
  id: string;
  subject: string;
  group: string;
  chapter: string;
  topic: string;
  difficulty: Difficulty;
  source: string;
};

let cache: Question[] | null = null;

const norm = (s: string) => s.toLowerCase().replace(/\s+/g, " ").trim();

/** Signature used to detect a repeated question (wording + option set). */
export function questionSignature(q: { q: string; options: string[] }): string {
  return `${norm(q.q)}||${[...q.options].map(norm).sort().join("|")}`;
}

/** Removes exact repeats, keeping the first occurrence. */
export function dedupeQuestions<T extends { q: string; options: string[] }>(items: T[]): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const item of items) {
    const key = questionSignature(item);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  return out;
}

/** Removes repeats by wording alone — used when picking questions for one test. */
export function dedupeByWording<T extends { q: string }>(items: T[]): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const item of items) {
    const key = norm(item.q);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  return out;
}


function toQuestion(r: import("./attempts").StoredQuestion, i: number): Question {
  return {
    q: r.q,
    options: r.options,
    answer: r.answer,
    explanation: r.explanation ?? "",
    id: r.id ?? `db__${i}`,
    subject: r.subject,
    group: r.subject,
    chapter: r.chapter ?? r.topic,
    topic: r.topic,
    difficulty: (r.difficulty ?? "medium") as Difficulty,
    source: r.source ?? "manual",
  };
}

let allCache: Question[] | null = null;

/** Loads every question stored in the cloud database (Firestore). */
export async function loadAll(): Promise<Question[]> {
  if (allCache) return allCache;
  const { listStoredQuestions } = await import("./attempts");
  const rows = await listStoredQuestions(5000);
  allCache = dedupeQuestions(rows.map(toQuestion));
  return allCache;
}

/** Distinct `source` tags present in the cloud database. */
export async function listSources(): Promise<string[]> {
  const all = await loadAll();
  return [...new Set(all.map((q) => q.source))].sort();
}

/** Practice / mock bank: every question in the cloud, including past papers. */
export async function loadQuestionBank(): Promise<Question[]> {
  if (cache) return cache;
  cache = await loadAll();
  if (!cache.length) throw new Error("No questions found in the cloud database yet.");
  return cache;
}


export type TestFilter = {
  subject?: string;
  group?: string;
  chapter?: string;
  topic?: string;
  difficulty?: Difficulty | "all";
};

export function filterQuestions(all: Question[], f: TestFilter): Question[] {
  return all.filter(
    (q) =>
      (!f.subject || f.subject === "all" || q.subject === f.subject) &&
      (!f.group || f.group === "all" || q.group === f.group) &&
      (!f.chapter || f.chapter === "all" || q.chapter === f.chapter) &&
      (!f.topic || f.topic === "all" || q.topic === f.topic) &&
      (!f.difficulty || f.difficulty === "all" || q.difficulty === f.difficulty),
  );
}

export function shuffle<T>(items: T[], seed = Date.now()): T[] {
  const arr = [...items];
  let s = seed % 2147483647;
  const rand = () => (s = (s * 16807) % 2147483647) / 2147483647;
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [arr[i], arr[j]] = [arr[j]!, arr[i]!];
  }
  return arr;
}

export function median(values: number[]): number {
  if (!values.length) return 0;
  const s = [...values].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid]! : (s[mid - 1]! + s[mid]!) / 2;
}

export function formatSeconds(sec: number): string {
  const s = Math.max(0, Math.round(sec));
  const m = Math.floor(s / 60);
  return m ? `${m}m ${s % 60}s` : `${s}s`;
}

export type QuestionSet = "bank" | "pyq-2025" | "pyq-2025-generated";

export const SET_LABELS: Record<Exclude<QuestionSet, "bank">, string> = {
  "pyq-2025": "MAH MCA CET 2025",
  "pyq-2025-generated": "MAH MCA CET 2025 — Practice Clone",
};

const setCache = new Map<string, Question[]>();

/** Loads every question carrying a given `source` tag from the cloud database. */
export async function loadQuestionSet(set: string): Promise<Question[]> {
  const cached = setCache.get(set);
  if (cached) return cached;
  const all = await loadAll();
  const list = all.filter((q) => q.source === set);
  if (!list.length) throw new Error("This question paper is not in the cloud database yet.");
  setCache.set(set, list);
  return list;
}

/**
 * Builds a full mock that respects the official subject weightage
 * (Maths 30%, Reasoning 30%, English 20%, Computer 20%).
 * Questions are shuffled inside each subject, but subjects stay grouped.
 */
export function buildWeightedMock(all: Question[], total = 100, seed = Date.now()): Question[] {
  const marks = SUBJECT_MARKS;
  const totalMarks = Object.values(marks).reduce((a, b) => a + b, 0);
  const out: Question[] = [];
  Object.entries(marks).forEach(([subject, mark], i) => {
    const want = Math.round((mark / totalMarks) * total);
    const pool = dedupeByWording(all.filter((q) => q.subject === subject));
    out.push(...shuffle(pool, seed + i * 7919).slice(0, want));
  });
  return out;
}

/** Clears the in-memory cache so the next load re-reads the cloud database. */
export function invalidateQuestionCache() {
  cache = null;
  allCache = null;
  setCache.clear();
}

/* ---------------------------------------------------------------
 * Admin-only seeding. Students never read these files; they exist
 * so an admin can push the starter content into the cloud once.
 * ------------------------------------------------------------- */

const SEED_FILES: Record<QuestionSet, string> = {
  bank: "/data/questions.json",
  "pyq-2025": "/data/pyq-2025.json",
  "pyq-2025-generated": "/data/pyq-2025-generated.json",
};

type SeedRecord = RawQuestion & { subject: string; topic: string; chapter?: string };

export async function loadSeedQuestions(set: QuestionSet): Promise<Question[]> {
  const res = await fetch(SEED_FILES[set]);
  if (!res.ok) throw new Error("Could not read the starter file");
  const data = await res.json();
  const rows: Question[] =
    set === "bank"
      ? (data as TopicBank[]).flatMap((bank) =>
          bank.questions.map((q, i) => ({
            ...q,
            explanation: q.explanation ?? "",
            id: `${bank.id}__${i}`,
            subject: bank.subject,
            group: bank.group,
            chapter: bank.chapter,
            topic: bank.topic,
            difficulty: (q.difficulty ?? "medium") as Difficulty,
            source: set,
          })),
        )
      : (data as SeedRecord[]).map((r, i) => ({
          ...r,
          explanation: r.explanation ?? "",
          id: `${set}__${i}`,
          subject: r.subject,
          group: r.subject,
          chapter: r.chapter ?? r.topic,
          topic: r.topic,
          difficulty: (r.difficulty ?? "medium") as Difficulty,
          source: set,
        }));
  return dedupeQuestions(rows);
}
