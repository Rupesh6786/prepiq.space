import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  BarChart3,
  BookOpen,
  CheckCircle2,
  ClipboardList,
  Crown,
  FileUp,
  LayoutDashboard,
  Layers,
  LogOut,
  Mail,
  Menu,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { listAllAttempts, listUsers, type Attempt, type AppUser } from "@/lib/attempts";
import { formatSeconds } from "@/lib/questions";
import { SYLLABUS, SUBJECT_MARKS } from "@/data/syllabus";
import { useAuth } from "@/lib/auth";
import { QuestionEditor } from "@/components/admin/question-editor";
import { QuestionReview } from "@/components/admin/question-review";
import { PaperManager } from "@/components/admin/paper-manager";
import { Approvals } from "@/components/admin/approvals";
import { Messages } from "@/components/admin/messages";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";


export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Admin Console — PrepIQ.space" },
      { name: "description", content: "PrepIQ.space admin console: question bank management, learner analytics and mock test insights." },
      { property: "og:title", content: "PrepIQ.space Admin Console" },
      { property: "og:description", content: "Manage questions and monitor learner performance across MAH MCA CET topics." },
      { property: "og:type", content: "website" },
      { name: "robots", content: "noindex" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AdminPage,
});

type Tab =
  | "overview"
  | "questions"
  | "review"
  | "papers"
  | "approvals"
  | "messages"
  | "users";

const NAV: { id: Tab; label: string; icon: typeof LayoutDashboard }[] = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "questions", label: "Question bank", icon: BookOpen },
  { id: "review", label: "Review questions", icon: ClipboardList },
  { id: "papers", label: "PYQ & mocks", icon: Layers },
  { id: "approvals", label: "Approvals", icon: CheckCircle2 },
  { id: "messages", label: "Messages", icon: Mail },
  { id: "users", label: "Learners", icon: Users },
];


const COLORS = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)"];

function AdminPage() {
  const { user, isAdmin, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("overview");
  const [menu, setMenu] = useState(false);
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [users, setUsers] = useState<AppUser[]>([]);

  useEffect(() => {
    if (loading) return;
    if (!user) void navigate({ to: "/login" });
    else if (!isAdmin) void navigate({ to: "/dashboard" });
  }, [loading, user, isAdmin, navigate]);

  useEffect(() => {
    if (!isAdmin) return;
    listAllAttempts().then(setAttempts).catch(() => setAttempts([]));
    listUsers().then(setUsers).catch(() => setUsers([]));
  }, [isAdmin]);

  const topSolved = useMemo(() => {
    const map = new Map<string, number>();
    for (const a of attempts) for (const q of a.questions ?? []) map.set(q.topic, (map.get(q.topic) ?? 0) + 1);
    return [...map.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([topic, solved]) => ({ topic: topic.length > 16 ? `${topic.slice(0, 15)}…` : topic, solved }));
  }, [attempts]);

  const subjectSplit = useMemo(
    () =>
      Object.keys(SUBJECT_MARKS).map((s) => ({
        name: s.split(" ")[0],
        value: SYLLABUS.filter((r) => r.subject === s).length,
      })),
    [],
  );

  const totals = useMemo(() => {
    const totalQ = attempts.reduce((a, b) => a + b.total, 0);
    const correct = attempts.reduce((a, b) => a + b.correct, 0);
    return {
      attempts: attempts.length,
      learners: users.length,
      accuracy: totalQ ? Math.round((correct / totalQ) * 100) : 0,
      avgTime: attempts.length ? attempts.reduce((a, b) => a + b.avgSeconds, 0) / attempts.length : 0,
    };
  }, [attempts, users]);

  return (
    <div className="flex min-h-screen bg-halo">
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r bg-card p-5 lg:flex">
        <Link to="/" className="flex items-center gap-2.5">
          <span className="grid size-9 place-items-center rounded-xl bg-[image:var(--gradient-royal)] text-primary-foreground">
            <Crown className="size-4" />
          </span>
          <span className="font-display text-lg font-bold">PrepIQ.space</span>
        </Link>
        <p className="mt-1 text-xs text-muted-foreground">Admin console</p>

        <nav className="mt-8 space-y-1">
          {NAV.map((n) => (
            <button
              key={n.id}
              onClick={() => setTab(n.id)}
              className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition ${tab === n.id ? "bg-primary/10 font-semibold text-primary" : "text-muted-foreground hover:bg-muted"}`}
            >
              <n.icon className="size-4" /> {n.label}
            </button>
          ))}
        </nav>

        <Button variant="soft" className="mt-auto" onClick={() => void signOut().then(() => navigate({ to: "/" }))}>
          <LogOut className="size-4" /> Sign out
        </Button>
      </aside>

      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-40 flex items-center gap-3 border-b bg-card/90 px-4 py-3 backdrop-blur lg:hidden">
          <Sheet open={menu} onOpenChange={setMenu}>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon" aria-label="Open admin menu">
                <Menu className="size-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 p-5">
              <SheetTitle className="font-display text-lg font-bold">Admin console</SheetTitle>
              <nav className="mt-6 space-y-1">
                {NAV.map((n) => (
                  <button
                    key={n.id}
                    onClick={() => {
                      setTab(n.id);
                      setMenu(false);
                    }}
                    className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition ${tab === n.id ? "bg-primary/10 font-semibold text-primary" : "text-muted-foreground hover:bg-muted"}`}
                  >
                    <n.icon className="size-4" /> {n.label}
                  </button>
                ))}
              </nav>
              <Button
                variant="soft"
                className="mt-6 w-full"
                onClick={() => void signOut().then(() => navigate({ to: "/" }))}
              >
                <LogOut className="size-4" /> Sign out
              </Button>
            </SheetContent>
          </Sheet>
          <span className="font-display font-bold">
            {NAV.find((n) => n.id === tab)?.label ?? "Admin"}
          </span>
        </header>

        <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
          {tab === "overview" && (
            <>
              <h1 className="font-display text-2xl font-extrabold sm:text-3xl">Platform overview</h1>
              <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <Stat label="Learners" value={String(totals.learners)} />
                <Stat label="Attempts" value={String(totals.attempts)} />
                <Stat label="Avg accuracy" value={`${totals.accuracy}%`} />
                <Stat label="Avg time / question" value={formatSeconds(totals.avgTime)} />
              </div>

              <div className="mt-8 grid gap-6 lg:grid-cols-2">
                <Panel title="Most solved topics">
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={topSolved}>
                      <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
                      <XAxis dataKey="topic" fontSize={11} interval={0} angle={-25} textAnchor="end" height={70} />
                      <YAxis fontSize={12} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "var(--popover)",
                          borderColor: "var(--border)",
                          borderRadius: "8px",
                          color: "var(--popover-foreground)",
                        }}
                        labelStyle={{ color: "var(--popover-foreground)" }}
                        itemStyle={{ color: "var(--popover-foreground)" }}
                      />
                      <Bar dataKey="solved" fill="var(--primary)" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </Panel>

                <Panel title="Syllabus coverage by subject">
                  <ResponsiveContainer width="100%" height={280}>
                    <PieChart>
                      <Pie data={subjectSplit} dataKey="value" nameKey="name" outerRadius={95} label>
                        {subjectSplit.map((_, i) => (
                          <Cell key={i} fill={COLORS[i % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "var(--popover)",
                          borderColor: "var(--border)",
                          borderRadius: "8px",
                          color: "var(--popover-foreground)",
                        }}
                        labelStyle={{ color: "var(--popover-foreground)" }}
                        itemStyle={{ color: "var(--popover-foreground)" }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </Panel>
              </div>
            </>
          )}

          {tab === "questions" && (
            <>
              <h1 className="font-display text-2xl font-extrabold">Question bank</h1>
              <p className="mt-2 mb-6 text-muted-foreground">
                {SYLLABUS.length} topics configured. Demo questions ship with the app; questions you add
                here are stored in the cloud database.
              </p>
              <QuestionEditor />
            </>
          )}

          {tab === "review" && (
            <>
              <h1 className="font-display text-2xl font-extrabold">Review questions</h1>
              <p className="mt-2 mb-6 text-muted-foreground">
                Filter by subject, chapter, topic and difficulty, check the correct option, then edit or delete.
              </p>
              <QuestionReview />
            </>
          )}

          {tab === "papers" && (
            <>
              <h1 className="font-display text-2xl font-extrabold">PYQ & mock papers</h1>
              <p className="mt-2 mb-6 text-muted-foreground">
                Tick the sources, subjects, chapters, topics and difficulty you want, then publish the
                selection as a new paper card on the practice page.
              </p>
              <PaperManager />
            </>
          )}

          {tab === "approvals" && (
            <>
              <h1 className="font-display text-2xl font-extrabold">Question approvals</h1>
              <p className="mt-2 mb-6 text-muted-foreground">
                Questions submitted by learners. Approving adds them to the main question bank.
              </p>
              <Approvals />
            </>
          )}

          {tab === "messages" && (
            <>
              <h1 className="font-display text-2xl font-extrabold">Support messages</h1>
              <p className="mt-2 mb-6 text-muted-foreground">
                Everything sent through the contact page, newest first.
              </p>
              <Messages />
            </>
          )}

          {tab === "users" && (
            <>
              <h1 className="font-display text-2xl font-extrabold">Learners</h1>
              <div className="mt-6 space-y-3">
                {users.map((u) => (
                  <div key={u.uid} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card p-4 shadow-sm">
                    <div>
                      <p className="font-semibold">{u.name || u.email}</p>
                      <p className="text-xs text-muted-foreground">{u.email}</p>
                    </div>
                    <div className="flex gap-2">
                      <Badge variant="secondary">{u.testsTaken ?? 0} tests</Badge>
                      <Badge variant="outline">{u.questionsSolved ?? 0} questions</Badge>
                    </div>
                  </div>
                ))}
                {!users.length && <p className="text-muted-foreground">No learners registered yet.</p>}
              </div>
            </>
          )}

          <div className="mt-10 flex items-center gap-2 text-xs text-muted-foreground">
            <BarChart3 className="size-3.5" /> Data refreshes on page load.
          </div>
        </main>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border bg-card p-5 shadow-sm">
      <p className="text-xs tracking-wide text-muted-foreground uppercase">{label}</p>
      <p className="mt-1 font-display text-2xl font-bold">{value}</p>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border bg-card p-5 shadow-sm">
      <h3 className="mb-4 font-display font-bold">{title}</h3>
      {children}
    </section>
  );
}
