import { createServerFn } from "@tanstack/react-start";

export type ParsedQuestion = {
  q: string;
  options: string[];
  answer: number;
  difficulty: "easy" | "medium" | "hard";
  explanation: string;
  subject: string;
  topic: string;
};

/**
 * Sends an uploaded question-paper PDF to Gemini and returns structured MCQs.
 * The PDF arrives as a base64 string (no filesystem needed in the worker).
 */
export const parseQuestionPdf = createServerFn({ method: "POST" })
  .inputValidator((data: { fileBase64: string; subjectHint?: string; topicHint?: string }) => {
    if (!data?.fileBase64 || typeof data.fileBase64 !== "string") throw new Error("A PDF file is required");
    if (data.fileBase64.length > 14_000_000) throw new Error("PDF is too large (max ~10 MB)");
    return data;
  })
  .handler(async ({ data }) => {
    const key = process.env["GOOGLE_API_KEY"];
    if (!key) throw new Error("GOOGLE_API_KEY is not configured");

    const prompt = `You are parsing a MAH MCA CET question paper PDF.
Extract every multiple-choice question you can find.
${data.subjectHint ? `Subject hint: ${data.subjectHint}.` : ""}
${data.topicHint ? `Topic hint: ${data.topicHint}.` : ""}
For each question return: the question text, exactly 4 options, the 0-based index of the correct option
(infer it if an answer key is present, otherwise solve it), a difficulty of easy|medium|hard,
a one sentence explanation, plus the subject and topic it belongs to.
Return ONLY JSON of the shape:
{"questions":[{"q":"","options":["","","",""],"answer":0,"difficulty":"medium","explanation":"","subject":"","topic":""}]}`;

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${key}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [
                { text: prompt },
                { inline_data: { mime_type: "application/pdf", data: data.fileBase64 } },
              ],
            },
          ],
          generationConfig: { responseMimeType: "application/json", temperature: 0.2 },
        }),
      },
    );

    if (!res.ok) {
      const detail = await res.text();
      console.error("Gemini PDF parse failed", res.status, detail.slice(0, 500));
      return { questions: [] as ParsedQuestion[], error: `Gemini request failed (${res.status})` };
    }

    const json = (await res.json()) as {
      candidates?: { content?: { parts?: { text?: string }[] } }[];
    };
    const text = json.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
    let parsed: { questions?: ParsedQuestion[] };
    try {
      parsed = JSON.parse(text.replace(/^```(json)?/i, "").replace(/```$/, ""));
    } catch {
      return { questions: [] as ParsedQuestion[], error: "Could not read Gemini's response" };
    }

    const questions = (parsed.questions ?? [])
      .filter((q) => q && typeof q.q === "string" && Array.isArray(q.options) && q.options.length === 4)
      .map((q) => ({
        q: q.q,
        options: q.options.map(String),
        answer: Math.min(3, Math.max(0, Number(q.answer) || 0)),
        difficulty: (["easy", "medium", "hard"].includes(q.difficulty) ? q.difficulty : "medium") as ParsedQuestion["difficulty"],
        explanation: String(q.explanation ?? ""),
        subject: String(q.subject ?? data.subjectHint ?? ""),
        topic: String(q.topic ?? data.topicHint ?? ""),
      }));

    return { questions, error: null as string | null };
  });
