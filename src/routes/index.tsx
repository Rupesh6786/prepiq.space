import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, BarChart3, BookOpenCheck, Crown, MonitorCheck, TimerReset } from "lucide-react";
import { SiteHeader, SiteFooter } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { SYLLABUS, SUBJECT_MARKS } from "@/data/syllabus";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "PrepIQ.space — MAH MCA CET 2027 Mock Tests & Topic Practice" },
      {
        name: "description",
        content:
          "Prepare for MAH MCA CET 2027 with topic-wise mock tests across 83 syllabus topics, timed papers and per-question time analytics.",
      },
      { property: "og:title", content: "PrepIQ.space — MAH MCA CET 2027 Preparation" },
      {
        property: "og:description",
        content: "Topic-wise mocks, AI-built question banks and deep analytics for MAH MCA CET.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Home,
});

const FAQ: { q: string; a: string }[] = [
  {
    q: "What exactly is the MAH MCA CET?",
    a: "It is the Maharashtra state entrance test for admission to MCA programmes. The paper carries 200 marks across Mathematics & Statistics, Logical / Abstract Reasoning, English & Verbal Ability and Computer Concepts, and is written in 90 minutes.",
  },
  {
    q: "How is the paper split across subjects?",
    a: "Mathematics & Statistics 60 marks, Logical / Abstract Reasoning 60 marks, English & Verbal Ability 40 marks and Computer Concepts 40 marks — that is 30%, 30%, 20% and 20% of the paper.",
  },
  {
    q: "How does a generated full mock work here?",
    a: "Press Generate full mock and we pull fresh questions from the cloud bank in exactly that weightage — 30 maths, 30 reasoning, 20 English, 20 computer — shuffled inside each subject but kept grouped, just like the real paper.",
  },
  {
    q: "Can I practise only one topic?",
    a: "Yes. Use the filters to pick a subject, chapter, topic and difficulty, then choose a question count or a timer. Questions come from the entire bank, including past papers.",
  },
  {
    q: "Is there negative marking?",
    a: "No. Each correct answer earns 2 marks; wrong and unattempted answers score zero, so it always pays to attempt.",
  },
  {
    q: "What do I see after I submit a test?",
    a: "Your score, accuracy and a full timing breakdown — average, median, fastest and slowest time per question — plus a subject-wise view of where you lost marks.",
  },
  {
    q: "Can I contribute my own questions?",
    a: "Yes. Open your profile and use Submit a new question. An admin reviews it, and once approved it joins the main question bank.",
  },
  {
    q: "Is PrepIQ.space free to use?",
    a: "Creating an account and practising is free. You just need to log in so your attempts and analytics are saved to your profile.",
  },
];


function Home() {
  const totalQuestions = SYLLABUS.length * 20;
  const subjects = Object.entries(SUBJECT_MARKS);

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />

      <section className="relative overflow-hidden bg-halo">
        <div
          className="animate-float pointer-events-none absolute -top-24 -right-24 size-72 rounded-full opacity-25 blur-3xl"
          style={{ background: "var(--gradient-gold)" }}
        />
        <div
          className="animate-float pointer-events-none absolute top-40 -left-32 size-80 rounded-full opacity-20 blur-3xl"
          style={{ background: "var(--gradient-royal)", animationDelay: "1.5s" }}
        />
        <div className="mx-auto w-full max-w-7xl px-4 pt-16 pb-20 sm:px-6 sm:pt-24 sm:pb-28">
          <div className="animate-rise mx-auto max-w-3xl text-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-gold/40 bg-gold-soft px-4 py-1.5 text-xs font-semibold tracking-wide text-royal uppercase">
              <Crown className="size-3.5" /> Target: March 2027
            </span>
            <h1 className="mt-6 text-4xl leading-[1.05] font-extrabold text-balance sm:text-6xl lg:text-7xl">
              Crack <span className="text-gradient-royal">MAH MCA CET</span> with practice that
              actually adapts
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-base text-pretty text-muted-foreground sm:text-lg">
              {totalQuestions.toLocaleString("en-IN")}+ exam-style MCQs across all{" "}
              {SYLLABUS.length} syllabus topics. Pick a subtopic, set your timer, and see exactly
              where your seconds go.
            </p>
            <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button asChild variant="royal" size="xl">
                <Link to="/practice">
                  Start a mock test <ArrowRight />
                </Link>
              </Button>
              <Button asChild variant="outline" size="xl">
                <Link to="/register">Create free account</Link>
              </Button>
            </div>
          </div>

          <div className="mx-auto mt-16 grid max-w-4xl grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            {[
              { k: "83", v: "Syllabus topics" },
              { k: "200", v: "Marks in paper" },
              { k: "20", v: "MCQs per topic" },
              { k: "90m", v: "Full mock timer" },
            ].map((s, i) => (
              <div
                key={s.v}
                className="surface-card animate-rise p-5 text-center"
                style={{ animationDelay: `${i * 90}ms` }}
              >
                <div className="font-display text-3xl font-bold text-royal">{s.k}</div>
                <div className="mt-1 text-xs text-muted-foreground">{s.v}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-7xl px-4 py-20 sm:px-6">
        <div className="max-w-2xl">
          <h2 className="text-3xl font-bold sm:text-4xl">The paper, decoded</h2>
          <p className="mt-3 text-muted-foreground">
            200 marks, four subjects, one clock. Here is how the weightage splits — and how many
            topics you still have to own.
          </p>
        </div>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {subjects.map(([subject, marks]) => {
            const topics = SYLLABUS.filter((s) => s.subject === subject).length;
            return (
              <div key={subject} className="surface-card group p-6 transition hover:-translate-y-1">
                <div className="gold-rule h-1 w-10 rounded-full" />
                <h3 className="mt-4 font-display text-lg font-semibold">{subject}</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  {marks} marks · {Math.round((marks / 200) * 100)}% weightage
                </p>
                <p className="mt-4 font-display text-4xl font-bold text-royal">{topics}</p>
                <p className="text-xs text-muted-foreground">topics in the syllabus</p>
              </div>
            );
          })}
        </div>
      </section>

      <section className="bg-secondary/60 py-20">
        <div className="mx-auto w-full max-w-7xl px-4 sm:px-6">
          <div className="max-w-3xl">
            <h2 className="text-3xl font-bold sm:text-4xl">
              Why choose PrepIQ.space MAH MCA CET Mock Tests?
            </h2>
            <p className="mt-4 text-base leading-relaxed text-muted-foreground">
              Prepare with focused practice that mirrors the real paper, covers the complete
              syllabus and turns every attempt into clear, useful feedback for your next session.
            </p>
          </div>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                icon: MonitorCheck,
                title: "Exam simulation",
                body: "Practise with the official 100-question structure, subject weightage and scoring pattern.",
              },
              {
                icon: BookOpenCheck,
                title: "Comprehensive coverage",
                body: "Strengthen every subject, chapter and topic through a broad, carefully organised question bank.",
              },
              {
                icon: TimerReset,
                title: "Realistic exam environment",
                body: "Build speed and focus with timed attempts, question navigation and review marking.",
              },
              {
                icon: BarChart3,
                title: "Detailed performance analysis",
                body: "Understand accuracy, time spent and weak areas with clear results after every test.",
              },
            ].map(({ icon: Icon, title, body }) => (
              <article key={title} className="surface-card p-6">
                <div className="grid size-11 place-items-center rounded-lg bg-royal-soft text-royal">
                  <Icon className="size-5" />
                </div>
                <h3 className="mt-5 text-lg font-semibold">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-secondary/60 py-20">
        <div className="mx-auto w-full max-w-3xl px-4 sm:px-6">
          <h2 className="text-3xl font-bold sm:text-4xl">Frequently asked questions</h2>
          <p className="mt-3 text-muted-foreground">
            Everything aspirants ask us about the exam and about using PrepIQ.space.
          </p>
          <Accordion type="single" collapsible className="mt-8">
            {FAQ.map((item, i) => (
              <AccordionItem key={item.q} value={`faq-${i}`}>
                <AccordionTrigger className="text-left text-base font-semibold">
                  {item.q}
                </AccordionTrigger>
                <AccordionContent className="text-sm leading-relaxed text-muted-foreground">
                  {item.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      <section className="mx-auto w-full max-w-7xl px-4 py-20 sm:px-6">
        <div className="surface-card relative overflow-hidden bg-[image:var(--gradient-royal)] p-10 text-center sm:p-16">
          <div className="animate-float pointer-events-none absolute -top-16 -right-10 size-56 rounded-full bg-white/10 blur-2xl" />
          <h2 className="relative font-display text-3xl font-bold text-primary-foreground sm:text-4xl">
            Your first mock is 60 seconds away
          </h2>
          <p className="relative mx-auto mt-4 max-w-xl text-primary-foreground/80">
            Sign up, pick Arithmetic or go full syllabus, and get a timing breakdown the moment you
            submit.
          </p>
          <div className="relative mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button asChild variant="gold" size="xl">
              <Link to="/register">
                Create account <ArrowRight />
              </Link>
            </Button>
            <Button
              asChild
              size="xl"
              variant="ghost"
              className="text-primary-foreground hover:bg-white/10"
            >
              <Link to="/login">I already have one</Link>
            </Button>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
