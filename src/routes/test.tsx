import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Flag, LogOut } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RichInline, RichText } from "@/components/rich-text";
import {
  buildWeightedMock,
  dedupeByWording,
  filterQuestions,
  formatSeconds,
  loadQuestionBank,
  loadQuestionSet,
  median,
  shuffle,
  SET_LABELS,
  type Difficulty,
  type Question,
} from "@/lib/questions";
import { saveAttempt, type AttemptQuestion } from "@/lib/attempts";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useAuth } from "@/lib/auth";

type TestSearch = {
  subject: string;
  chapter: string;
  topic: string;
  difficulty: Difficulty | "all";
  mode: "count" | "timed";
  count: number;
  minutes: number;
  /** "bank" = filtered practice, "mock100" = weighted generated mock, otherwise a source tag. */
  set: string;
  /** Optional id of an admin-created paper in the `papers` collection. */
  paper: string;
};

export const Route = createFileRoute("/test")({
  validateSearch: (search: Record<string, unknown>): TestSearch => {
    return {
      subject: String(search["subject"] ?? "all"),
      chapter: String(search["chapter"] ?? "all"),
      topic: String(search["topic"] ?? "all"),
      difficulty: (search["difficulty"] as TestSearch["difficulty"]) ?? "all",
      mode: search["mode"] === "timed" ? "timed" : "count",
      count: Number(search["count"] ?? 20),
      minutes: Number(search["minutes"] ?? 20),
      set: String(search["set"] ?? "bank"),
      paper: String(search["paper"] ?? ""),
    };
  },

  head: () => ({
    meta: [
      { title: "Mock Test in Progress — PrepIQ.space" },
      { name: "description", content: "Timed MAH MCA CET mock test runner with question palette, auto-submit and instant analytics." },
      { property: "og:title", content: "Mock Test — PrepIQ.space" },
      { property: "og:description", content: "Take a timed or question-count based MAH MCA CET mock test." },
      { property: "og:type", content: "website" },
      { name: "robots", content: "noindex" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: TestPage,
});

function TestPage() {
  const s = Route.useSearch();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();

  useEffect(() => {
    if (!authLoading && !user) {
      toast.info("Please log in to take a test.");
      void navigate({ to: "/login" });
    }
  }, [authLoading, user, navigate]);

  const [questions, setQuestions] = useState<Question[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<(number | null)[]>([]);
  const [marked, setMarked] = useState<Set<number>>(new Set());
  const [visited, setVisited] = useState<Set<number>>(new Set());
  const [times, setTimes] = useState<number[]>([]);
  const [elapsed, setElapsed] = useState(0);
  const [finished, setFinished] = useState(false);
  const [confirmSubmit, setConfirmSubmit] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);

  const startedAt = useRef(Date.now());
  const qStartedAt = useRef(Date.now());

  const [paperTitle, setPaperTitle] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      if (s.paper) {
        const { getPaper } = await import("@/lib/profile");
        const paper = await getPaper(s.paper);
        if (!paper) throw new Error("This paper is no longer available.");
        setPaperTitle(paper.title);
        const all = await loadQuestionBank();
        const f = paper.filters ?? {};
        const inList = (list: string[] | undefined, value: string) =>
          !list || !list.length || list.includes(value);
        const pool = dedupeByWording(
          all.filter(
            (q) =>
              inList(f.sources, q.source) &&
              inList(f.subjects, q.subject) &&
              inList(f.chapters, q.chapter) &&
              inList(f.topics, q.topic) &&
              inList(f.difficulties, q.difficulty),
          ),
        );
        if (!pool.length) throw new Error("This paper has no questions yet.");
        return shuffle(pool).slice(0, Math.max(1, paper.total || pool.length));
      }
      if (s.set === "mock100") {
        const all = await loadQuestionBank();
        const picked = buildWeightedMock(all, Math.max(4, s.count || 100));
        if (!picked.length) throw new Error("The question bank is empty.");
        return picked;
      }
      if (s.set !== "bank") {
        const paper = dedupeByWording(await loadQuestionSet(s.set));
        if (!paper.length) throw new Error("This question paper is empty.");
        return paper;
      }
      const bank = await loadQuestionBank();
      const pool = dedupeByWording(
        filterQuestions(bank, {
          subject: s.subject,
          chapter: s.chapter,
          topic: s.topic,
          difficulty: s.difficulty,
        }),
      );
      if (!pool.length) throw new Error("No questions match the chosen filters.");
      const size = s.mode === "timed" ? Math.min(pool.length, 100) : Math.min(Math.max(5, s.count), pool.length);
      return shuffle(pool).slice(0, size);
    };

    load()
      .then((picked) => {
        setQuestions(picked);
        setAnswers(Array(picked.length).fill(null));
        setTimes(Array(picked.length).fill(0));
        setVisited(new Set([0]));
        startedAt.current = Date.now();
        qStartedAt.current = Date.now();
      })
      .catch((e: Error) => setError(e.message));
  }, [user, s.subject, s.chapter, s.topic, s.difficulty, s.mode, s.count, s.set]);


  useEffect(() => {
    if (!questions || finished) return;
    const t = setInterval(() => setElapsed(Math.round((Date.now() - startedAt.current) / 1000)), 1000);
    return () => clearInterval(t);
  }, [questions, finished]);

  const limit = s.mode === "timed" ? s.minutes * 60 : null;
  const timeLeft = limit === null ? null : Math.max(0, limit - elapsed);

  function stampTime(from = index) {
    const spent = (Date.now() - qStartedAt.current) / 1000;
    setTimes((t) => t.map((v, i) => (i === from ? v + spent : v)));
    qStartedAt.current = Date.now();
  }

  function goTo(next: number) {
    stampTime();
    const target = Math.min((questions?.length ?? 1) - 1, Math.max(0, next));
    setIndex(target);
    setVisited((current) => new Set(current).add(target));
  }

  function submit() {
    stampTime();
    setFinished(true);
  }

  useEffect(() => {
    if (timeLeft === 0 && !finished && questions) {
      toast.info("Time is up — submitting your test.");
      submit();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeLeft, finished, questions]);

  const result = useMemo(() => {
    if (!finished || !questions) return null;
    const detail: AttemptQuestion[] = questions.map((q, i) => ({
      questionId: q.id,
      subject: q.subject,
      topic: q.topic,
      difficulty: q.difficulty,
      selected: answers[i] ?? null,
      correctIndex: q.answer,
      correct: answers[i] === q.answer,
      seconds: Math.round(times[i] ?? 0),
    }));
    const secs = detail.map((d) => d.seconds);
    const correct = detail.filter((d) => d.correct).length;
    const skipped = detail.filter((d) => d.selected === null).length;
    const sum = secs.reduce((a, b) => a + b, 0);
    return {
      detail,
      correct,
      skipped,
      wrong: detail.length - correct - skipped,
      total: detail.length,
      scorePercent: detail.length ? Math.round((correct / detail.length) * 100) : 0,
      totalSeconds: sum,
      avgSeconds: secs.length ? sum / secs.length : 0,
      medianSeconds: median(secs),
      maxSeconds: secs.length ? Math.max(...secs) : 0,
      minSeconds: secs.length ? Math.min(...secs) : 0,
    };
  }, [finished, questions, answers, times]);

  const saved = useRef(false);
  useEffect(() => {
    if (!result || !user || saved.current) return;
    saved.current = true;
    void saveAttempt({
      uid: user.uid,
      userName: user.displayName ?? user.email ?? "Student",
      mode: s.mode,
      label:
        paperTitle ??
        (s.set === "mock100"
          ? "Generated full mock"
          : s.set !== "bank"
            ? (SET_LABELS[s.set as keyof typeof SET_LABELS] ?? s.set)
            : s.topic !== "all"
              ? s.topic
              : s.chapter !== "all"
                ? s.chapter
                : s.subject !== "all"
                  ? s.subject
                  : "Full mock test"),


      subject: s.subject,
      topic: s.topic,
      total: result.total,
      correct: result.correct,
      wrong: result.wrong,
      skipped: result.skipped,
      scorePercent: result.scorePercent,
      totalSeconds: result.totalSeconds,
      avgSeconds: result.avgSeconds,
      medianSeconds: result.medianSeconds,
      maxSeconds: result.maxSeconds,
      minSeconds: result.minSeconds,
      questions: result.detail,
      createdAtMs: Date.now(),
    })
      .then(() => toast.success("Attempt saved to your dashboard"))
      .catch(() => toast.error("Could not save this attempt"));
  }, [result, user, s.mode, s.subject, s.topic, s.chapter]);

  if (error) {
    return (
      <Centered>
        <p className="text-muted-foreground">{error}</p>
        <Button variant="royal" className="mt-4" onClick={() => navigate({ to: "/practice" })}>
          Back to filters
        </Button>
      </Centered>
    );
  }

  if (!questions) return <Centered><p className="text-muted-foreground">Preparing your test…</p></Centered>;

  if (result) {
    return (
      <div className="min-h-screen bg-halo">
        <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
          <h1 className="font-display text-3xl font-extrabold">Test complete</h1>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Stat label="Score" value={`${result.scorePercent}%`} />
            <Stat label="Correct" value={`${result.correct}/${result.total}`} />
            <Stat label="Wrong" value={String(result.wrong)} />
            <Stat label="Skipped" value={String(result.skipped)} />
            <Stat label="Avg time / question" value={formatSeconds(result.avgSeconds)} />
            <Stat label="Median time" value={formatSeconds(result.medianSeconds)} />
            <Stat label="Slowest question" value={formatSeconds(result.maxSeconds)} />
            <Stat label="Fastest question" value={formatSeconds(result.minSeconds)} />
          </div>

          <h2 className="mt-10 font-display text-xl font-bold">Question review</h2>
          <div className="mt-4 space-y-3">
            {questions.map((q, i) => {
              const d = result.detail[i]!;
              return (
                <div key={q.id} className="rounded-xl border bg-card p-4 shadow-sm">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0 text-sm font-medium">
                      <span className="mr-1">{i + 1}.</span>
                      <RichText text={q.q} className="inline-block align-top" />
                    </div>
                    <Badge variant={d.correct ? "secondary" : "destructive"}>
                      {d.correct ? "Correct" : d.selected === null ? "Skipped" : "Wrong"} · {formatSeconds(d.seconds)}
                    </Badge>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Correct answer:{" "}
                    <RichInline text={q.options[q.answer] ?? ""} className="font-medium text-foreground" />
                    {d.selected !== null && !d.correct && (
                      <> · You chose: <RichInline text={q.options[d.selected] ?? ""} /></>
                    )}
                  </p>
                  {q.explanation && (
                    <RichText text={q.explanation} className="mt-1 text-sm text-muted-foreground" />
                  )}
                </div>
              );
            })}
          </div>

          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild variant="royal"><Link to="/practice">Take another test</Link></Button>
            <Button asChild variant="soft"><Link to="/dashboard">Go to dashboard</Link></Button>
          </div>
        </main>
      </div>
    );
  }

  const current = questions[index]!;
  const answered = answers.filter((a) => a !== null).length;
  const questionGroups = questions.reduce<{ subject: string; items: { question: Question; index: number }[] }[]>(
    (groups, question, questionIndex) => {
      const existing = groups.find((group) => group.subject === question.subject);
      if (existing) existing.items.push({ question, index: questionIndex });
      else groups.push({ subject: question.subject, items: [{ question, index: questionIndex }] });
      return groups;
    },
    [],
  );
  const stateCounts = questions.reduce(
    (counts, _, questionIndex) => {
      const isVisited = visited.has(questionIndex);
      const isAnswered = answers[questionIndex] !== null;
      const isMarked = marked.has(questionIndex);
      if (!isVisited) counts.notVisited += 1;
      else if (isAnswered && isMarked) counts.answeredReviewed += 1;
      else if (isAnswered) counts.attempted += 1;
      else if (isMarked) counts.markedReview += 1;
      else counts.notAttempted += 1;
      return counts;
    },
    { notVisited: 0, attempted: 0, answeredReviewed: 0, notAttempted: 0, markedReview: 0 },
  );

  function paletteState(questionIndex: number) {
    const isVisited = visited.has(questionIndex);
    const isAnswered = answers[questionIndex] !== null;
    const isMarked = marked.has(questionIndex);
    if (!isVisited) return "border-border bg-muted text-muted-foreground";
    if (isAnswered && isMarked) return "border-success bg-success text-primary-foreground";
    if (isAnswered) return "border-primary bg-primary text-primary-foreground";
    if (isMarked) return "border-accent bg-accent text-accent-foreground";
    return "border-destructive/50 bg-destructive/10 text-destructive";
  }

  return (
    <div className="min-h-screen bg-halo lg:h-screen lg:overflow-hidden">
      <main className="mx-auto grid min-h-screen max-w-[1600px] gap-4 p-3 sm:p-5 lg:h-screen lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-5">
        <section className="flex min-w-0 flex-col overflow-hidden rounded-xl border bg-card shadow-sm">
          <header className="border-b px-4 py-4 sm:px-6">
            <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4">
              <div className="min-w-0">
                <div className="flex min-w-0 flex-wrap items-center gap-2">
                  <h1 className="mr-1 truncate text-lg font-bold sm:text-xl">{current.subject}</h1>
                  {current.chapter && <Badge variant="outline">{current.chapter}</Badge>}
                  <Badge variant="secondary">{current.topic}</Badge>
                  <Badge variant="outline">{current.difficulty}</Badge>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Question {index + 1} of {questions.length}
                </p>
              </div>
              <div className="shrink-0 text-right text-sm">
                <p className="text-muted-foreground">Elapsed {formatSeconds(elapsed)}</p>
                {timeLeft !== null && (
                  <p className={`font-semibold ${timeLeft < 60 ? "text-destructive" : "text-primary"}`}>
                    {formatSeconds(timeLeft)} left
                  </p>
                )}
              </div>
            </div>
          </header>

          <div className="h-1.5 bg-muted">
            <div
              className="h-full bg-[image:var(--gradient-royal)] transition-all"
              style={{ width: `${((index + 1) / questions.length) * 100}%` }}
            />
          </div>

          <article className="flex min-h-[560px] flex-1 flex-col overflow-y-auto p-4 sm:p-7 lg:min-h-0">
            <RichText text={current.q} className="text-lg leading-relaxed font-semibold sm:text-xl" />
            <div className="mt-6 space-y-3">
              {current.options.map((opt, optionIndex) => {
                const active = answers[index] === optionIndex;
                return (
                  <Button
                    key={optionIndex}
                    type="button"
                    variant="outline"
                    onClick={() => setAnswers((items) => items.map((value, i) => (i === index ? optionIndex : value)))}
                    className={`h-auto min-h-14 w-full justify-start whitespace-normal p-4 text-left ${active ? "border-primary bg-primary/10 text-foreground ring-1 ring-primary" : "hover:bg-muted/60"}`}
                  >
                    <span className={`grid size-8 shrink-0 place-items-center rounded-md border text-xs ${active ? "border-primary bg-primary text-primary-foreground" : ""}`}>
                      {String.fromCharCode(65 + optionIndex)}
                    </span>
                    <RichInline text={opt} className="min-w-0 leading-relaxed" />
                  </Button>
                );
              })}
            </div>

            <div className="mt-auto flex flex-wrap items-center justify-center gap-3 border-t pt-6">
              <Button variant="soft" onClick={() => goTo(index - 1)} disabled={index === 0}>
                <ChevronLeft /> Previous
              </Button>
              <Button
                variant={marked.has(index) ? "secondary" : "outline"}
                onClick={() =>
                  setMarked((currentMarked) => {
                    const next = new Set(currentMarked);
                    next.has(index) ? next.delete(index) : next.add(index);
                    return next;
                  })
                }
              >
                <Flag /> {marked.has(index) ? "Marked for review" : "Mark for review"}
              </Button>
              <Button variant="royal" onClick={() => goTo(index + 1)} disabled={index === questions.length - 1}>
                Next <ChevronRight />
              </Button>
              <Button variant="ghost" onClick={() => setAnswers((items) => items.map((value, i) => (i === index ? null : value)))}>
                Clear answer
              </Button>
              <Button variant="ghost" className="text-destructive" onClick={() => setConfirmCancel(true)}>
                <LogOut /> Cancel test
              </Button>
            </div>
          </article>
        </section>

        <aside className="flex min-h-[620px] flex-col overflow-hidden rounded-xl border bg-card shadow-sm lg:min-h-0">
          <section className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-5">
            <h2 className="font-display text-lg font-bold">All questions</h2>
            <p className="mt-1 text-xs text-muted-foreground">Choose any question to open it</p>
            <div className="mt-5 space-y-6">
              {questionGroups.map((group) => (
                <div key={group.subject}>
                  <h3 className="mb-2 text-xs font-semibold text-muted-foreground uppercase">
                    {group.subject}
                  </h3>
                  <div className="grid grid-cols-6 gap-2">
                    {group.items.map(({ index: questionIndex }) => (
                      <Button
                        key={questionIndex}
                        type="button"
                        size="icon"
                        variant="outline"
                        onClick={() => goTo(questionIndex)}
                        aria-label={`Open question ${questionIndex + 1}`}
                        className={`size-9 border text-xs ${paletteState(questionIndex)} ${questionIndex === index ? "ring-2 ring-ring ring-offset-2 ring-offset-background" : ""}`}
                      >
                        {questionIndex + 1}
                      </Button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="shrink-0 border-t bg-background/60 p-4 sm:p-5">
            <Button variant="gold" size="lg" className="w-full" onClick={() => setConfirmSubmit(true)}>
              Submit test
            </Button>
            <h3 className="mt-5 text-sm font-bold">Question status</h3>
            <div className="mt-3 space-y-2 text-sm">
              <StatusRow label="Not visited" value={stateCounts.notVisited} tone="bg-muted" />
              <StatusRow label="Attempted" value={stateCounts.attempted} tone="bg-primary" />
              <StatusRow label="Answered & reviewed" value={stateCounts.answeredReviewed} tone="bg-success" />
              <StatusRow label="Not attempted" value={stateCounts.notAttempted} tone="bg-destructive" />
              <StatusRow label="Marked for review" value={stateCounts.markedReview} tone="bg-accent" />
            </div>
          </section>
        </aside>

        <AlertDialog open={confirmSubmit} onOpenChange={setConfirmSubmit}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure you want to submit?</AlertDialogTitle>
              <AlertDialogDescription>
                You have answered {answered} of {questions.length} questions. Once submitted you
                cannot change your answers.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={submit}>Submit</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <AlertDialog open={confirmCancel} onOpenChange={setConfirmCancel}>
          <AlertDialogContent>
            <AlertDialogTitle>Cancel this test?</AlertDialogTitle>
            <AlertDialogDescription>
              Your progress will be lost and nothing will be saved to your dashboard.
            </AlertDialogDescription>
            <AlertDialogFooter>
              <AlertDialogCancel>Keep going</AlertDialogCancel>
              <AlertDialogAction onClick={() => navigate({ to: "/practice" })}>
                Cancel test
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </main>
    </div>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return <div className="grid min-h-screen place-items-center bg-halo px-4 text-center">{children}</div>;
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border bg-card p-5 shadow-sm">
      <p className="text-xs tracking-wide text-muted-foreground uppercase">{label}</p>
      <p className="mt-1 font-display text-2xl font-bold">{value}</p>
    </div>
  );
}

function StatusRow({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <div className="flex items-center gap-2 text-muted-foreground">
      <span className={`size-3 shrink-0 rounded-sm ${tone}`} />
      <span className="min-w-0 flex-1">{label}</span>
      <span className="font-semibold text-foreground">{value}</span>
    </div>
  );
}
