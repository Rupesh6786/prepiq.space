import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Timer, ListChecks, FileText, Sparkles, ArrowRight, Layers } from "lucide-react";
import { SiteHeader, SiteFooter } from "@/components/site-header";
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
import { SYLLABUS, SUBJECT_MARKS } from "@/data/syllabus";
import {
  filterQuestions,
  loadQuestionBank,
  SET_LABELS,
  type Difficulty,
  type Question,
} from "@/lib/questions";
import { listPapers, type Paper } from "@/lib/profile";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/practice")({
  head: () => ({
    meta: [
      { title: "Practice & Mock Tests — MAH MCA CET 2027" },
      {
        name: "description",
        content:
          "Generate a weightage-balanced 100-question mock, take past papers, or build a topic-wise practice set with timer and instant analytics.",
      },
      { property: "og:title", content: "Practice & Mock Tests — MAH MCA CET 2027" },
      {
        property: "og:description",
        content: "Weightage-based full mocks, previous-year papers and topic-wise practice for MAH MCA CET.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PracticePage,
});

const ALL = "all";
const uniq = (xs: string[]) => [...new Set(xs)].sort();

/** Source tags that are part of the general bank, not a standalone paper. */
const BANK_SOURCES = new Set(["bank", "manual", "community", ""]);

function PracticePage() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [bank, setBank] = useState<Question[] | null>(null);
  const [bankError, setBankError] = useState<string | null>(null);
  const [papers, setPapers] = useState<Paper[]>([]);

  const [subject, setSubject] = useState(ALL);
  const [chapter, setChapter] = useState(ALL);
  const [topic, setTopic] = useState(ALL);
  const [difficulty, setDifficulty] = useState<Difficulty | "all">(ALL);
  const [mode, setMode] = useState<"count" | "timed">("count");
  const [count, setCount] = useState(20);
  const [minutes, setMinutes] = useState(20);

  useEffect(() => {
    if (!user) return;
    loadQuestionBank().then(setBank).catch((e: Error) => setBankError(e.message));
    listPapers().then(setPapers).catch(() => setPapers([]));
  }, [user]);

  function requireLogin() {
    if (user) return true;
    toast.info("Please log in to start a test.");
    void navigate({ to: "/login" });
    return false;
  }

  const chapters = useMemo(
    () => uniq(SYLLABUS.filter((r) => subject === ALL || r.subject === subject).map((r) => r.chapter)),
    [subject],
  );
  const topics = useMemo(
    () =>
      uniq(
        SYLLABUS.filter(
          (r) => (subject === ALL || r.subject === subject) && (chapter === ALL || r.chapter === chapter),
        ).map((r) => r.topic),
      ),
    [subject, chapter],
  );

  const pool = useMemo(
    () => (bank ? filterQuestions(bank, { subject, chapter, topic, difficulty }) : []),
    [bank, subject, chapter, topic, difficulty],
  );

  /** Papers discovered automatically from the `source` tag on stored questions. */
  const sourceCards = useMemo(() => {
    if (!bank) return [];
    const counts = new Map<string, number>();
    for (const q of bank) if (!BANK_SOURCES.has(q.source)) counts.set(q.source, (counts.get(q.source) ?? 0) + 1);
    return [...counts.entries()].map(([source, total]) => ({
      source,
      total,
      title: SET_LABELS[source as keyof typeof SET_LABELS] ?? source.toUpperCase().replace(/-/g, " "),
      kind: source.startsWith("pyq") ? ("PYQ" as const) : ("MOCK" as const),
      minutes: 90,
    }));
  }, [bank]);

  function start() {
    if (!requireLogin()) return;
    if (!pool.length) {
      toast.error("No questions match these filters yet.");
      return;
    }
    void navigate({
      to: "/test",
      search: { subject, chapter, topic, difficulty, mode, count, minutes, set: "bank", paper: "" },
    });
  }

  function generateMock() {
    if (!requireLogin()) return;
    void navigate({
      to: "/test",
      search: {
        subject: ALL,
        chapter: ALL,
        topic: ALL,
        difficulty: ALL,
        mode: "timed",
        count: 100,
        minutes: 90,
        set: "mock100",
        paper: "",
      },
    });
  }

  function openSource(source: string, minutes: number, total: number) {
    if (!requireLogin()) return;
    void navigate({
      to: "/test",
      search: {
        subject: ALL,
        chapter: ALL,
        topic: ALL,
        difficulty: ALL,
        mode: "timed",
        count: total,
        minutes,
        set: source,
        paper: "",
      },
    });
  }

  function openPaper(p: Paper) {
    if (!requireLogin()) return;
    void navigate({
      to: "/test",
      search: {
        subject: ALL,
        chapter: ALL,
        topic: ALL,
        difficulty: ALL,
        mode: "timed",
        count: p.total,
        minutes: p.minutes,
        set: "paper",
        paper: p.id ?? "",
      },
    });
  }

  return (
    <div className="min-h-screen bg-halo">
      <SiteHeader />
      <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
        <h1 className="font-display text-3xl font-extrabold sm:text-4xl">Practice & tests</h1>
        <p className="mt-2 text-muted-foreground">
          Generate a weightage-balanced mock, attempt a past paper, or build your own set.{" "}
          {!user
            ? "Log in to load the question bank and start a test."
            : bank
              ? <Badge variant="secondary">{bank.length} questions in the bank</Badge>
              : "Loading questions from the cloud…"}
        </p>
        {bankError && (
          <p className="mt-4 rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
            {bankError}
          </p>
        )}

        {/* ---------------- Generated full mock ---------------- */}
        <section className="mt-8">
          <h2 className="font-display text-xl font-bold">Full mock tests</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <TestCard
              kind="MOCK"
              title="Generate full mock"
              subtitle="Fresh questions every time, in exam weightage"
              minutes={90}
              total={100}
              onStart={generateMock}
              highlight
            />
            {sourceCards.map((c) => (
              <TestCard
                key={c.source}
                kind={c.kind}
                title={c.title}
                subtitle={`${c.total} questions tagged ${c.source}`}
                minutes={c.minutes}
                total={c.total}
                onStart={() => openSource(c.source, c.minutes, c.total)}
              />
            ))}
            {papers.map((p) => (
              <TestCard
                key={p.id}
                kind={p.kind}
                title={p.title}
                subtitle="Curated by the PrepIQ team"
                minutes={p.minutes}
                total={p.total}
                onStart={() => openPaper(p)}
              />
            ))}
          </div>
          <p className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
            <Layers className="size-3.5" />
            Weightage per generated mock:{" "}
            {Object.entries(SUBJECT_MARKS)
              .map(([s, m]) => `${s.split(" ")[0]} ${Math.round((m / 200) * 100)}%`)
              .join(" · ")}
          </p>
        </section>

        {/* ---------------- Custom test builder ---------------- */}
        <section className="mt-12">
          <h2 className="font-display text-xl font-bold">Build your own test</h2>
          <div className="mt-4 grid gap-5 rounded-2xl border bg-card p-6 shadow-sm sm:grid-cols-2">
            <Field label="Subject">
              <Picker
                value={subject}
                onChange={(v) => {
                  setSubject(v);
                  setChapter(ALL);
                  setTopic(ALL);
                }}
                options={uniq(SYLLABUS.map((r) => r.subject))}
                allLabel="All subjects"
              />
            </Field>
            <Field label="Chapter">
              <Picker
                value={chapter}
                onChange={(v) => {
                  setChapter(v);
                  setTopic(ALL);
                }}
                options={chapters}
                allLabel="All chapters"
              />
            </Field>
            <Field label="Topic / sub-topic">
              <Picker value={topic} onChange={setTopic} options={topics} allLabel="All topics" />
            </Field>
            <Field label="Difficulty">
              <Picker
                value={difficulty}
                onChange={(v) => setDifficulty(v as Difficulty | "all")}
                options={["easy", "medium", "hard"]}
                allLabel="Any difficulty"
              />
            </Field>
            <Field label="Test format">
              <Picker
                value={mode}
                onChange={(v) => setMode(v as "count" | "timed")}
                options={["count", "timed"]}
                allLabel=""
                labels={{ count: "Question count based", timed: "Time based" }}
              />
            </Field>
            {mode === "count" ? (
              <Field label="Number of questions">
                <Input
                  type="number"
                  min={5}
                  max={100}
                  value={count}
                  onChange={(e) => setCount(Number(e.target.value))}
                />
              </Field>
            ) : (
              <Field label="Duration (minutes)">
                <Input
                  type="number"
                  min={5}
                  max={120}
                  value={minutes}
                  onChange={(e) => setMinutes(Number(e.target.value))}
                />
              </Field>
            )}

            <div className="sm:col-span-2">
              {user && bank && (
                <p className="mb-3 text-sm text-muted-foreground">
                  <Badge variant="secondary">{pool.length} questions match</Badge>
                </p>
              )}
              <Button
                variant="royal"
                size="lg"
                className="w-full"
                onClick={start}
                disabled={!!user && (!bank || !pool.length)}
              >
                <ListChecks className="size-4" /> Start test
              </Button>
            </div>
          </div>

          {!user && !authLoading && (
            <Button asChild variant="soft" size="lg" className="mt-4 w-full">
              <Link to="/login">Log in or register to start</Link>
            </Button>
          )}
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}

function TestCard({
  kind,
  title,
  subtitle,
  minutes,
  total,
  onStart,
  highlight,
}: {
  kind: "PYQ" | "MOCK";
  title: string;
  subtitle: string;
  minutes: number;
  total: number;
  onStart: () => void;
  highlight?: boolean;
}) {
  return (
    <article className="surface-card group flex flex-col overflow-hidden transition hover:-translate-y-1">
      <div
        className="relative h-24 overflow-hidden"
        style={{ backgroundImage: highlight ? "var(--gradient-royal)" : "var(--gradient-gold)" }}
      >
        <div className="animate-float absolute -top-8 -right-6 size-24 rounded-full bg-white/20 blur-2xl" />
        <div className="animate-float absolute -bottom-10 left-4 size-20 rounded-full bg-white/15 blur-xl" />
        <span className="absolute top-3 left-4 rounded-full bg-white/25 px-3 py-1 text-xs font-bold tracking-wide text-white uppercase backdrop-blur">
          {kind === "PYQ" ? <FileText className="mr-1 inline size-3" /> : <Sparkles className="mr-1 inline size-3" />}
          {kind}
        </span>
      </div>
      <div className="flex flex-1 flex-col p-5">
        <h3 className="font-display text-base font-bold">{title}</h3>
        <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Badge variant="secondary">
            <Timer className="mr-1 size-3" /> {minutes} min
          </Badge>
          <Badge variant="outline">{total} questions</Badge>
        </div>
        <Button variant={highlight ? "royal" : "gold"} className="mt-5 w-full" onClick={onStart}>
          Start test <ArrowRight className="size-4" />
        </Button>
      </div>
    </article>
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
  labels,
}: {
  value: string;
  onChange: (v: string) => void;
  options: string[];
  allLabel: string;
  labels?: Record<string, string>;
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger>
        <SelectValue />
      </SelectTrigger>
      <SelectContent className="max-h-72">
        {allLabel && <SelectItem value={ALL}>{allLabel}</SelectItem>}
        {options.map((o) => (
          <SelectItem key={o} value={o}>
            {labels?.[o] ?? o}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
