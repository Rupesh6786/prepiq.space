import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SYLLABUS } from "@/data/syllabus";
import { addStoredQuestions, listStoredQuestions, type StoredQuestion } from "@/lib/attempts";

const SUBJECT_OPTIONS = [
  "Mathematics & Statistics",
  "Logical / Abstract Reasoning",
  "English & Verbal Ability",
  "Computer Concepts",
] as const;

const emptyDraft = {
  q: "",
  options: ["", "", "", ""],
  answer: 0,
  difficulty: "medium",
  explanation: "",
  topicId: SYLLABUS[0]!.id,
  source: "admin",
  subject: SYLLABUS[0]?.subject || SUBJECT_OPTIONS[0],
  chapter: SYLLABUS[0]?.chapter || "",
};

export function QuestionEditor() {
  const [stored, setStored] = useState<StoredQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState(emptyDraft);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");

  useEffect(() => {
    listStoredQuestions()
      .then(setStored)
      .catch(() => setStored([]))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(
    () =>
      stored.filter((s) =>
        `${s.q} ${s.topic} ${s.subject} ${s.source || ""}`.toLowerCase().includes(search.trim().toLowerCase()),
      ),
    [stored, search],
  );

  // Automatically sync subject and chapter when a syllabus topic is chosen
  function handleTopicChange(topicId: string) {
    const row = SYLLABUS.find((r) => r.id === topicId);
    setDraft((prev) => ({
      ...prev,
      topicId,
      subject: row ? row.subject : prev.subject,
      chapter: row ? row.chapter : prev.chapter,
    }));
  }

  async function save() {
    const row = SYLLABUS.find((r) => r.id === draft.topicId);
    if (!draft.q.trim() || draft.options.some((o) => !o.trim())) {
      toast.error("Fill the question and all four options.");
      return;
    }
    setSaving(true);
    const question: StoredQuestion = {
      q: draft.q.trim(),
      options: draft.options.map((o) => o.trim()),
      answer: draft.answer,
      difficulty: draft.difficulty,
      explanation: draft.explanation.trim(),
      subject: draft.subject,
      chapter: row ? row.chapter : "",
      topic: row ? row.topic : "",
      source: draft.source.trim() || "admin",
    };
    try {
      await addStoredQuestions([question]);
      setStored((s) => [question, ...s]);
      setDraft({ ...emptyDraft, topicId: draft.topicId, subject: SYLLABUS[0]?.subject || SUBJECT_OPTIONS[0] });
      toast.success("Question added to the bank");
    } catch {
      toast.error("Could not save the question");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-8">
      <section className="rounded-2xl border bg-card p-6 shadow-sm">
        <h2 className="font-display text-lg font-bold">Add a new question</h2>
        <div className="mt-5 grid gap-5 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label>Question</Label>
            <Textarea rows={3} value={draft.q} onChange={(e) => setDraft({ ...draft, q: e.target.value })} placeholder="Type the question…" />
          </div>

          {draft.options.map((opt, i) => (
            <div key={i} className="space-y-2">
              <Label>
                Option {String.fromCharCode(65 + i)}
                {draft.answer === i && <Badge variant="secondary" className="ml-2">Correct</Badge>}
              </Label>
              <div className="flex gap-2">
                <Input
                  value={opt}
                  onChange={(e) =>
                    setDraft({ ...draft, options: draft.options.map((o, j) => (j === i ? e.target.value : o)) })
                  }
                />
                <Button type="button" variant={draft.answer === i ? "royal" : "soft"} onClick={() => setDraft({ ...draft, answer: i })}>
                  Set
                </Button>
              </div>
            </div>
          ))}

          <div className="space-y-2">
            <Label>Topic</Label>
            <Select value={draft.topicId} onValueChange={handleTopicChange}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent className="max-h-72">
                {SYLLABUS.map((r) => (
                  <SelectItem key={r.id} value={r.id}>{r.subject.split(" ")[0]} · {r.topic}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Subject</Label>
            <Select value={draft.subject} onValueChange={(v) => setDraft({ ...draft, subject: v })}>
              <SelectTrigger><SelectValue placeholder="Select subject" /></SelectTrigger>
              <SelectContent>
                {SUBJECT_OPTIONS.map((sub) => (
                  <SelectItem key={sub} value={sub}>{sub}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Source</Label>
            <Input
              value={draft.source}
              onChange={(e) => setDraft({ ...draft, source: e.target.value })}
              placeholder="e.g. admin, PDF parser, PYQ..."
            />
          </div>

          <div className="space-y-2">
            <Label>Difficulty</Label>
            <Select value={draft.difficulty} onValueChange={(v) => setDraft({ ...draft, difficulty: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {["easy", "medium", "hard"].map((d) => (
                  <SelectItem key={d} value={d}>{d}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2 sm:col-span-2">
            <Label>Explanation</Label>
            <Textarea rows={2} value={draft.explanation} onChange={(e) => setDraft({ ...draft, explanation: e.target.value })} />
          </div>
        </div>

        <div className="mt-5 flex gap-3">
          <Button variant="royal" onClick={save} disabled={saving}>
            <Plus className="size-4" /> {saving ? "Saving…" : "Add question"}
          </Button>
          <Button variant="ghost" onClick={() => setDraft({ ...emptyDraft, topicId: draft.topicId, subject: SYLLABUS[0]?.subject || SUBJECT_OPTIONS[0] })}>
            <Trash2 className="size-4" /> Clear
          </Button>
        </div>
      </section>

      <section>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-lg font-bold">Stored questions ({stored.length})</h2>
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search questions, subjects, sources…" className="max-w-xs" />
        </div>
        <div className="mt-4 space-y-3">
          {loading && <p className="text-muted-foreground">Loading…</p>}
          {!loading && !filtered.length && (
            <p className="text-muted-foreground">
              Nothing stored yet. Demo questions ship with the app; questions added here or parsed from PDFs live in Cloud Firestore.
            </p>
          )}
          {filtered.slice(0, 50).map((s, i) => (
            <div key={s.id ?? i} className="rounded-xl border bg-card p-4 shadow-sm">
              <p className="text-sm font-medium">{s.q}</p>
              <div className="mt-2 flex flex-wrap gap-2 text-xs">
                <Badge variant="secondary">{s.topic}</Badge>
                {s.subject && <Badge variant="outline">Subject: {s.subject}</Badge>}
                {s.source && <Badge variant="outline">Source: {s.source}</Badge>}
                <Badge variant="outline">{s.difficulty}</Badge>
                <Badge variant="outline">Ans: {s.options[s.answer]}</Badge>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}