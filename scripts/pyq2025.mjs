// Extracts + solves the MAH MCA CET 2025 previous-year paper into JSON,
// then generates fresh exam-style questions modelled on it.
// Usage: node scripts/pyq2025.mjs /tmp/pyq.txt
import fs from "node:fs";

const KEY = process.env.GOOGLE_API_KEY;
const SRC = process.argv[2] ?? "/tmp/pyq.txt";
const OUT_PYQ = "public/data/pyq-2025.json";
const OUT_GEN = "public/data/pyq-2025-generated.json";

const raw = fs
  .readFileSync(SRC, "utf8")
  .replace(/\(https?:\/\/[^)]*\)/g, "")
  .replace(/MAH CET MCA[^\n]*PYQ[^\n]*/g, "")
  .replace(/Go to Discussion/g, "")
  .replace(/\n{3,}/g, "\n\n");

const parts = raw.split(/\n\s*Qus\s*:\s*(\d+)/).slice(1);
const items = [];
for (let i = 0; i < parts.length; i += 2) items.push(`Qus ${parts[i]}\n${parts[i + 1]}`);
console.log("question blocks:", items.length);

const chunks = [];
for (let i = 0; i < items.length; i += 8) chunks.push(items.slice(i, i + 8).join("\n\n"));

async function gemini(prompt, attempt = 0) {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: "application/json", temperature: 0.3 },
      }),
    },
  );
  if (!res.ok) {
    const t = await res.text();
    if (attempt < 4 && (res.status === 429 || res.status >= 500)) {
      await new Promise((r) => setTimeout(r, 5000 * (attempt + 1)));
      return gemini(prompt, attempt + 1);
    }
    throw new Error(`${res.status} ${t.slice(0, 200)}`);
  }
  const data = await res.json();
  const txt = data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";
  try {
    return JSON.parse(txt.replace(/^```(json)?/i, "").replace(/```$/, ""));
  } catch {
    if (attempt < 3) return gemini(prompt, attempt + 1);
    throw new Error("parse fail");
  }
}

const SCHEMA = `Return ONLY JSON: {"questions":[{"q":"","options":["","","",""],"answer":0,"difficulty":"easy|medium|hard","explanation":"","subject":"Mathematics & Statistics|Logical / Abstract Reasoning|English & Verbal Ability|Computer Concepts","topic":""}]}
Rules: exactly 4 options; "answer" is the 0-based index of the correct option; solve the question yourself to be certain;
"explanation" is a short step-by-step solution; plain text math (x^2, sqrt(5), 3/4); no markdown fences.`;

async function extractChunk(chunk, i) {
  const out = await gemini(
    `You are cleaning up OCR text of the MAH MCA CET 2025 question paper.
Rebuild every complete multiple-choice question found below into structured data. Skip fragments that lack 4 options.
If a question depends on a reading passage, include the passage text inside "q".
${SCHEMA}

TEXT:
${chunk}`,
  );
  console.log(`chunk ${i + 1}/${chunks.length} -> ${(out.questions ?? []).length}`);
  return out.questions ?? [];
}

async function generateFor(subject, topics, n) {
  const out = await gemini(
    `You are an expert MAH MCA CET paper setter. Using the style, difficulty and pattern of the MAH MCA CET 2025 paper,
write ${n} ORIGINAL multiple-choice questions for the subject "${subject}".
Cover these areas evenly: ${topics.join("; ")}.
No repetition of concepts, plausible distractors that mirror common mistakes, exam-realistic (solvable in ~90 seconds).
${SCHEMA}`,
  );
  console.log(`generated ${subject} -> ${(out.questions ?? []).length}`);
  return (out.questions ?? []).map((q) => ({ ...q, subject }));
}

const clean = (qs, source) =>
  qs
    .filter((q) => q && typeof q.q === "string" && Array.isArray(q.options) && q.options.length === 4)
    .map((q) => ({
      q: String(q.q).trim(),
      options: q.options.map((o) => String(o).trim()),
      answer: Math.min(3, Math.max(0, Number(q.answer) || 0)),
      difficulty: ["easy", "medium", "hard"].includes(q.difficulty) ? q.difficulty : "medium",
      explanation: String(q.explanation ?? ""),
      subject: String(q.subject ?? ""),
      topic: String(q.topic ?? ""),
      source,
    }));

const dedupe = (qs) => {
  const seen = new Set();
  return qs.filter((q) => {
    const k = q.q.toLowerCase().replace(/\s+/g, " ").trim();
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
};

const GEN_PLAN = [
  ["Mathematics & Statistics", ["Algebra & Binomial", "Coordinate Geometry & Vectors", "Calculus & Differential Equations", "Trigonometry", "Probability & Statistics", "Mensuration"], 30],
  ["Logical / Abstract Reasoning", ["Puzzles & Seating Arrangement", "Coding-Decoding, Series & Analogy", "Syllogism & Venn Diagram", "Direction Sense & Blood Relations", "Critical Reasoning"], 30],
  ["English & Verbal Ability", ["Reading Comprehension", "Grammar & Error Spotting", "Vocabulary & Synonyms/Antonyms", "Idioms, Phrases & Sentence Rearrangement"], 20],
  ["Computer Concepts", ["Computer Architecture & Hardware", "Binary Arithmetic & Logic Gates", "C Programming & Data Structures", "Operating System Concepts"], 20],
];

const [pyqLists, genLists] = await Promise.all([
  Promise.all(chunks.map((c, i) => extractChunk(c, i).catch((e) => (console.error("chunk fail", i, String(e).slice(0, 120)), [])))),
  Promise.all(GEN_PLAN.map(([s, t, n]) => generateFor(s, t, n).catch((e) => (console.error("gen fail", s, String(e).slice(0, 120)), [])))),
]);

const pyq = dedupe(clean(pyqLists.flat(), "MAH MCA CET 2025"));
const gen = dedupe(clean(genLists.flat(), "CETVerse 2025-style"));
fs.writeFileSync(OUT_PYQ, JSON.stringify(pyq, null, 0));
fs.writeFileSync(OUT_GEN, JSON.stringify(gen, null, 0));
console.log("PYQ:", pyq.length, "GENERATED:", gen.length);
