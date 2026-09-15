import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { FileUp, Sparkles, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SYLLABUS } from "@/data/syllabus";
import { parseQuestionPdf, type ParsedQuestion } from "@/lib/parse-pdf.functions";
import { addStoredQuestions } from "@/lib/attempts";

function toBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(",")[1] ?? "");
    reader.onerror = () => reject(new Error("Could not read the file"));
    reader.readAsDataURL(file);
  });
}

export function PdfUpload() {
  const parse = useServerFn(parseQuestionPdf);
  const [file, setFile] = useState<File | null>(null);
  const [topicId, setTopicId] = useState(SYLLABUS[0]!.id);
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [questions, setQuestions] = useState<ParsedQuestion[]>([]);

  const row = SYLLABUS.find((r) => r.id === topicId)!;

  async function analyse() {
    if (!file) {
      toast.error("Choose a PDF first.");
      return;
    }
    setBusy(true);
    try {
      const fileBase64 = await toBase64(file);
      const res = await parse({ data: { fileBase64, subjectHint: row.subject, topicHint: row.topic } });
      if (res.error) toast.error(res.error);
      setQuestions(res.questions);
      if (res.questions.length) toast.success(`${res.questions.length} questions extracted`);
      else if (!res.error) toast.error("No questions could be extracted from this PDF.");
    } catch (e) {
      toast.error((e as Error).message || "Parsing failed");
    } finally {
      setBusy(false);
    }
  }

  async function saveAll() {
    setSaving(true);
    try {
      await addStoredQuestions(
        questions.map((q) => ({
          q: q.q,
          options: q.options,
          answer: q.answer,
          difficulty: q.difficulty,
          explanation: q.explanation,
          subject: q.subject || row.subject,
          chapter: row.chapter,
          topic: q.topic || row.topic,
          source: file?.name ?? "pdf",
        })),
      );
      toast.success("Questions saved to the bank");
      setQuestions([]);
      setFile(null);
    } catch {
      toast.error("Could not save the questions");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border bg-card p-6 shadow-sm">
        <div className="grid gap-5 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Question paper PDF</Label>
            <Input type="file" accept="application/pdf" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          </div>
          <div className="space-y-2">
            <Label>Default topic (used when the AI can't tell)</Label>
            <Select value={topicId} onValueChange={setTopicId}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent className="max-h-72">
                {SYLLABUS.map((r) => (
                  <SelectItem key={r.id} value={r.id}>{r.subject.split(" ")[0]} · {r.topic}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="mt-5 flex flex-wrap gap-3">
          <Button variant="royal" onClick={analyse} disabled={busy || !file}>
            <Sparkles className="size-4" /> {busy ? "Analysing with AI…" : "Analyse PDF"}
          </Button>
          {!!questions.length && (
            <Button variant="gold" onClick={saveAll} disabled={saving}>
              <Save className="size-4" /> {saving ? "Saving…" : `Save ${questions.length} questions`}
            </Button>
          )}
        </div>
        {!file && (
          <p className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
            <FileUp className="size-4" /> PDFs up to about 10 MB work best.
          </p>
        )}
      </section>

      {!!questions.length && (
        <section className="space-y-3">
          <h2 className="font-display text-lg font-bold">Preview ({questions.length})</h2>
          {questions.map((q, i) => (
            <div key={i} className="rounded-xl border bg-card p-4 shadow-sm">
              <p className="text-sm font-medium">{i + 1}. {q.q}</p>
              <ul className="mt-2 grid gap-1 text-sm text-muted-foreground sm:grid-cols-2">
                {q.options.map((o, j) => (
                  <li key={j} className={j === q.answer ? "font-medium text-foreground" : ""}>
                    {String.fromCharCode(65 + j)}. {o}
                  </li>
                ))}
              </ul>
              <div className="mt-2 flex flex-wrap gap-2 text-xs">
                <Badge variant="secondary">{q.topic || row.topic}</Badge>
                <Badge variant="outline">{q.difficulty}</Badge>
              </div>
            </div>
          ))}
        </section>
      )}
    </div>
  );
}
