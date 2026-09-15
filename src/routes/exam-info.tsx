import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { SUBJECT_MARKS } from "@/data/syllabus";

export const Route = createFileRoute("/exam-info")({
  head: () => ({
    meta: [
      { title: "MAH MCA CET 2027 Exam Pattern & Dates" },
      { name: "description", content: "MAH MCA CET 2027 exam pattern, marking scheme, subject-wise marks, duration and important dates explained simply." },
      { property: "og:title", content: "MAH MCA CET 2027 Exam Pattern & Dates" },
      { property: "og:description", content: "200 marks, 100 minutes, four subjects — everything you need to know before the CET." },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ExamInfoPage,
});

const FACTS = [
  { label: "Total marks", value: "200" },
  { label: "Duration", value: "90 minutes" },
  { label: "Questions", value: "100 MCQs" },
  { label: "Negative marking", value: "None" },
  { label: "Mode", value: "Computer based" },
  { label: "Exam window", value: "4th week of March 2027" },
];

function ExamInfoPage() {
  return (
    <div className="min-h-screen bg-halo">
      <SiteHeader />
      <main className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
        <h1 className="font-display text-3xl font-extrabold sm:text-4xl">Exam information</h1>
        <p className="mt-2 text-muted-foreground">
          Know the paper before you sit for it. Here is the MAH MCA CET 2027 blueprint.
        </p>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FACTS.map((f) => (
            <div key={f.label} className="rounded-xl border bg-card p-5 shadow-sm">
              <p className="text-xs tracking-wide text-muted-foreground uppercase">{f.label}</p>
              <p className="mt-1 font-display text-xl font-bold">{f.value}</p>
            </div>
          ))}
        </div>

        <h2 className="mt-12 font-display text-2xl font-bold">Marks distribution</h2>
        <div className="mt-4 space-y-3">
          {Object.entries(SUBJECT_MARKS).map(([subject, marks]) => (
            <div key={subject} className="rounded-xl border bg-card p-4 shadow-sm">
              <div className="flex items-center justify-between text-sm font-medium">
                <span>{subject}</span>
                <span>{marks} marks</span>
              </div>
              <div className="mt-2 h-2 rounded-full bg-muted">
                <div
                  className="h-2 rounded-full bg-[image:var(--gradient-royal)]"
                  style={{ width: `${(marks / 200) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>

        <div className="mt-12 rounded-2xl border bg-card p-8 text-center shadow-sm">
          <h2 className="font-display text-2xl font-bold">Ready for a timed rehearsal?</h2>
          <p className="mt-2 text-muted-foreground">Pick a topic or run the full mock test.</p>
          <Button asChild variant="royal" className="mt-5">
            <Link to="/practice">Start practising</Link>
          </Button>
        </div>
      </main>
    </div>
  );
}
