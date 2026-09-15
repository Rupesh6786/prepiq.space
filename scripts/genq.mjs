import fs from "node:fs";

const syllabus = JSON.parse(fs.readFileSync("scripts/syllabus.json", "utf8"));
const OUT = "scripts/out";
fs.mkdirSync(OUT, { recursive: true });
const KEY = "AIzaSyAdt6IHNavAw7KSNP3tbV9JgpElHcTA_8M";

const slug = (s) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

async function gen(item, attempt = 0) {
  const id = `${slug(item.subject)}__${slug(item.topic)}`;
  const file = `${OUT}/${id}.json`;
  if (fs.existsSync(file)) return "cached";
  const prompt = `You are an expert MAH MCA CET (Maharashtra MCA Common Entrance Test) paper setter.
Create exactly 20 original multiple-choice questions for:
Subject: ${item.subject}
Chapter: ${item.chapter}
Topic: ${item.topic}
Difficulty mix: 7 easy, 9 medium, 4 hard. Exam-realistic, solvable in under 90 seconds each.
Each question has exactly 4 options, exactly one correct, and a one or two sentence explanation.
Return ONLY JSON: {"questions":[{"q":"...","options":["a","b","c","d"],"answer":0,"difficulty":"easy|medium|hard","explanation":"..."}]}
No markdown fences. Use plain text math notation (e.g. x^2, sqrt(5), 3/4).`;

  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Lovable-API-Key": KEY,
      "X-Lovable-AIG-SDK": "fetch",
    },
    body: JSON.stringify({
      model: "google/gemini-3.7-flash",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
    }),
  });
  if (!res.ok) {
    const t = await res.text();
    if ((res.status === 429 || res.status >= 500) && attempt < 4) {
      await new Promise((r) => setTimeout(r, 4000 * (attempt + 1)));
      return gen(item, attempt + 1);
    }
    throw new Error(`${item.topic} ${res.status} ${t.slice(0, 200)}`);
  }
  const data = await res.json();
  let txt = data.choices?.[0]?.message?.content ?? "";
  txt = txt.replace(/^```(json)?/i, "").replace(/```$/, "");
  let parsed;
  try {
    parsed = JSON.parse(txt);
  } catch {
    if (attempt < 3) return gen(item, attempt + 1);
    throw new Error(`parse fail ${item.topic}`);
  }
  const qs = (parsed.questions || []).filter(
    (q) => q && typeof q.q === "string" && Array.isArray(q.options) && q.options.length === 4,
  );
  if (qs.length < 10 && attempt < 3) return gen(item, attempt + 1);
  fs.writeFileSync(file, JSON.stringify({ ...item, id, questions: qs }));
  return qs.length;
}

let i = 0;
let done = 0;
async function worker() {
  while (i < syllabus.length) {
    const item = syllabus[i++];
    try {
      const n = await gen(item);
      done++;
      console.log(`[${done}/${syllabus.length}] ${item.topic} -> ${n}`);
    } catch (e) {
      console.error("FAIL", item.topic, String(e).slice(0, 200));
    }
  }
}
await Promise.all(Array.from({ length: 6 }, worker));
console.log("ALL DONE");
