import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { FilePenLine, Pencil, Save, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { SYLLABUS } from "@/data/syllabus";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  deleteStoredQuestion,
  listStoredQuestions,
  updateStoredQuestion,
  type StoredQuestion,
} from "@/lib/attempts";
import { invalidateQuestionCache } from "@/lib/questions";
import { QuestionStudio } from "@/components/admin/question-studio";
import { MathRenderer } from "@/components/math-renderer";

const ALL = "all";
const uniq = (xs: (string | undefined)[]) => [...new Set(xs.filter(Boolean) as string[])].sort();
type ContentFilter = "equation" | "ordered" | "unordered" | "code";

const CONTENT_FILTERS: { id: ContentFilter; label: string }[] = [
  { id: "equation", label: "Equation" },
  { id: "ordered", label: "Numbered list" },
  { id: "unordered", label: "Bullet list" },
  { id: "code", label: "Code" },
];
const SUBJECT_OPTIONS = [
  "Mathematics & Statistics",
  "Logical / Abstract Reasoning",
  "English & Verbal Ability",
  "Computer Concepts",
] as const;

function hasContent(row: StoredQuestion, kind: ContentFilter) {
  const text = [row.q, ...row.options, row.explanation ?? ""].join("\n");
  if (kind === "equation") return /\$[^$]+\$|\\\([\s\S]+?\\\)|\\(?:sqrt|frac|times|div|leq|geq)|\b(?:sqrt)\s*\(|[A-Za-z0-9)]\^[{A-Za-z0-9]/.test(text);
  if (kind === "ordered") return /(?:^|\n)\s*(?:\d+[.)]|\([a-zivx]+\))\s+/i.test(text);
  if (kind === "unordered") return /(?:^|\n)\s*[-*•]\s+/.test(text);
  return /```[\s\S]*```|`[^`]+`/.test(text);
}

export function QuestionReview() {
  const [rows, setRows] = useState<StoredQuestion[]>([]);
  const [loading, setLoading] = useState(true);

  const [subject, setSubject] = useState(ALL);
  const [chapter, setChapter] = useState(ALL);
  const [topic, setTopic] = useState(ALL);
  const [difficulty, setDifficulty] = useState(ALL);
  const [source, setSource] = useState(ALL);
  const [search, setSearch] = useState("");
  const [contentFilters, setContentFilters] = useState<ContentFilter[]>([]);

  const [editing, setEditing] = useState<StoredQuestion | null>(null);
  const [studioQuestion, setStudioQuestion] = useState<StoredQuestion | null>(null);
  const [busy, setBusy] = useState(false);

  async function refresh() {
    setLoading(true);
    try {
      setRows(await listStoredQuestions());
    } catch {
      toast.error("Could not load questions from the cloud database");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refresh();
  }, []);

  const subjects = useMemo(() => uniq(rows.map((r) => r.subject)), [rows]);
  const chapters = useMemo(
    () => uniq(rows.filter((r) => subject === ALL || r.subject === subject).map((r) => r.chapter)),
    [rows, subject],
  );
  const topics = useMemo(
    () =>
      uniq(
        rows
          .filter(
            (r) =>
              (subject === ALL || r.subject === subject) && (chapter === ALL || r.chapter === chapter),
          )
          .map((r) => r.topic),
      ),
    [rows, subject, chapter],
  );
  const sources = useMemo(() => uniq(rows.map((r) => r.source ?? "manual")), [rows]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return rows.filter(
      (r) =>
        (subject === ALL || r.subject === subject) &&
        (chapter === ALL || r.chapter === chapter) &&
        (topic === ALL || r.topic === topic) &&
        (difficulty === ALL || r.difficulty === difficulty) &&
        (source === ALL || (r.source ?? "manual") === source) &&
        contentFilters.every((kind) => hasContent(r, kind)) &&
        (!term || r.q.toLowerCase().includes(term)),
    );
  }, [rows, subject, chapter, topic, difficulty, source, search, contentFilters]);

  async function saveEdit() {
    if (!editing?.id) return;
    setBusy(true);
    try {
      await updateStoredQuestion(editing.id, editing);
      setRows((rs) => rs.map((r) => (r.id === editing.id ? editing : r)));
      setEditing(null);
      toast.success("Question updated");
    } catch {
      toast.error("Could not update the question");
    } finally {
      setBusy(false);
    }
  }

  async function remove(row: StoredQuestion) {
    if (!row.id) return;
    if (!confirm("Delete this question permanently?")) return;
    try {
      await deleteStoredQuestion(row.id);
      setRows((rs) => rs.filter((r) => r.id !== row.id));
      toast.success("Question deleted");
    } catch {
      toast.error("Could not delete the question");
    }
  }

  return (
    <div className="space-y-6">
      <section className="grid gap-4 rounded-2xl border bg-card p-5 shadow-sm sm:grid-cols-2 lg:grid-cols-3">
        <Field label="Subject">
          <Picker value={subject} onChange={(v) => { setSubject(v); setChapter(ALL); setTopic(ALL); }} options={subjects} allLabel="All subjects" />
        </Field>
        <Field label="Chapter">
          <Picker value={chapter} onChange={(v) => { setChapter(v); setTopic(ALL); }} options={chapters} allLabel="All chapters" />
        </Field>
        <Field label="Topic / sub-topic">
          <Picker value={topic} onChange={setTopic} options={topics} allLabel="All topics" />
        </Field>
        <Field label="Difficulty">
          <Picker value={difficulty} onChange={setDifficulty} options={["easy", "medium", "hard"]} allLabel="Any difficulty" />
        </Field>
        <Field label="Source">
          <Picker value={source} onChange={setSource} options={sources} allLabel="All sources" />
        </Field>
        <Field label="Search">
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search wording…" />
        </Field>
      </section>

      <p className="text-sm text-muted-foreground">
        {loading ? "Loading questions…" : `${filtered.length} of ${rows.length} questions shown`}
      </p>

      <div className="space-y-3">
        {!loading && !rows.length && (
          <p className="rounded-xl border bg-card p-6 text-muted-foreground shadow-sm">
            No questions are currently available for review.
          </p>
        )}

        {filtered.slice(0, 300).map((row) => (
          <article key={row.id} className="rounded-xl border bg-card p-4 shadow-sm">
            <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
              <MathRenderer text={row.q} className="min-w-0 text-sm font-medium" />
              <div className="flex shrink-0 flex-wrap justify-end gap-2">
                <Button size="sm" variant="soft" onClick={() => setEditing({ ...row, options: [...row.options] })}>
                  <Pencil className="size-3.5" /> Edit
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setStudioQuestion({ ...row, options: [...row.options] })}
                >
                  <FilePenLine className="size-3.5" /> Editor
                </Button>
                <Button size="sm" variant="ghost" onClick={() => void remove(row)}>
                  <Trash2 className="size-3.5 text-destructive" />
                </Button>
              </div>
            </div>

            <ol className="mt-3 grid gap-2 sm:grid-cols-2">
              {row.options.map((opt, i) => (
                <li
                  key={i}
                  className={`rounded-lg border px-3 py-2 text-sm flex items-start gap-2 ${i === row.answer ? "border-primary bg-primary/5 font-medium" : ""}`}
                >
                  <span className="shrink-0 text-xs text-muted-foreground">{String.fromCharCode(65 + i)}</span>
                  <MathRenderer text={opt} className="min-w-0 flex-1" />
                  {i === row.answer && <Badge variant="secondary" className="ml-auto">Correct</Badge>}
                </li>
              ))}
            </ol>

            {row.explanation && (
              <MathRenderer text={row.explanation} className="mt-2 text-xs text-muted-foreground" />
            )}

            <div className="mt-3 flex flex-wrap gap-2 text-xs">
              <Badge variant="outline">{row.subject}</Badge>
              {row.chapter && <Badge variant="outline">{row.chapter}</Badge>}
              <Badge variant="secondary">{row.topic}</Badge>
              <Badge variant="outline">{row.difficulty}</Badge>
              <Badge variant="outline">{row.source ?? "manual"}</Badge>
            </div>
          </article>
        ))}
        {filtered.length > 300 && (
          <p className="text-sm text-muted-foreground">Showing the first 300 — narrow the filters to see more.</p>
        )}
      </div>

      {editing && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4">
          <div className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-2xl border bg-card p-6 shadow-lg">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-lg font-bold">Edit question</h3>
              <Button variant="ghost" size="sm" onClick={() => setEditing(null)}><X className="size-4" /></Button>
            </div>

            <div className="mt-5 space-y-4">
              <div className="space-y-2">
                <Label>Question</Label>
                <Textarea rows={3} value={editing.q} onChange={(e) => setEditing({ ...editing, q: e.target.value })} />
              </div>

              {editing.options.map((opt, i) => (
                <div key={i} className="space-y-2">
                  <Label>Option {String.fromCharCode(65 + i)}</Label>
                  <div className="flex gap-2">
                    <Input
                      value={opt}
                      onChange={(e) =>
                        setEditing({ ...editing, options: editing.options.map((o, j) => (j === i ? e.target.value : o)) })
                      }
                    />
                    <Button
                      type="button"
                      variant={editing.answer === i ? "royal" : "soft"}
                      onClick={() => setEditing({ ...editing, answer: i })}
                    >
                      Correct
                    </Button>
                  </div>
                </div>
              ))}

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Topic">
                  <Select
                    value={
                      SYLLABUS.find((r) => r.topic === editing.topic)?.id ||
                      SYLLABUS[0]!.id
                    }
                    onValueChange={(topicId) => {
                      const row = SYLLABUS.find((r) => r.id === topicId);
                      if (row) {
                        setEditing({
                          ...editing,
                          topic: row.topic,
                          subject: row.subject,
                          chapter: row.chapter,
                        });
                      }
                    }}
                  >
                    <SelectTrigger><SelectValue placeholder="Select topic" /></SelectTrigger>
                    <SelectContent className="max-h-72">
                      {SYLLABUS.map((r) => (
                        <SelectItem key={r.id} value={r.id}>
                          {r.subject.split(" ")[0]} · {r.topic}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>

                <Field label="Subject">
                  <Select
                    value={editing.subject || SUBJECT_OPTIONS[0]}
                    onValueChange={(v) => setEditing({ ...editing, subject: v })}
                  >
                    <SelectTrigger><SelectValue placeholder="Select subject" /></SelectTrigger>
                    <SelectContent>
                      {SUBJECT_OPTIONS.map((sub) => (
                        <SelectItem key={sub} value={sub}>{sub}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Source">
                  <Input
                    value={editing.source ?? "admin"}
                    onChange={(e) => setEditing({ ...editing, source: e.target.value })}
                    placeholder="e.g. admin, PDF parser, PYQ..."
                  />
                </Field>
                <Field label="Difficulty">
                  <Picker
                    value={editing.difficulty}
                    onChange={(v) => setEditing({ ...editing, difficulty: v })}
                    options={["easy", "medium", "hard"]}
                    allLabel=""
                  />
                </Field>
              </div>

              <div className="space-y-2">
                <Label>Explanation</Label>
                <Textarea
                  rows={2}
                  value={editing.explanation ?? ""}
                  onChange={(e) => setEditing({ ...editing, explanation: e.target.value })}
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <Button variant="ghost" onClick={() => setEditing(null)}>Cancel</Button>
              <Button variant="royal" onClick={() => void saveEdit()} disabled={busy}>
                <Save className="size-4" /> {busy ? "Saving…" : "Save changes"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {studioQuestion && (
        <QuestionStudio
          question={studioQuestion}
          onClose={() => setStudioQuestion(null)}
          onSaved={(saved) => {
            setRows((current) => current.map((row) => (row.id === saved.id ? saved : row)));
            invalidateQuestionCache();
          }}
        />
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

function Picker({
  value,
  onChange,
  options,
  allLabel,
}: {
  value: string;
  onChange: (v: string) => void;
  options: string[];
  allLabel: string;
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger><SelectValue /></SelectTrigger>
      <SelectContent className="max-h-72">
        {allLabel && <SelectItem value={ALL}>{allLabel}</SelectItem>}
        {options.map((o) => (
          <SelectItem key={o} value={o}>{o}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}