import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { listUserAttempts, type Attempt } from "@/lib/attempts";
import { formatSeconds } from "@/lib/questions";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Your Dashboard — PrepIQ.space MAH MCA CET Prep" },
      { name: "description", content: "Track your MAH MCA CET mock test scores, accuracy trend, timing stats and subject-wise strengths." },
      { property: "og:title", content: "Your PrepIQ.space Dashboard" },
      { property: "og:description", content: "Scores, accuracy trends and per-question timing analytics for your CET practice." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: DashboardPage,
});

function DashboardPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [attempts, setAttempts] = useState<Attempt[] | null>(null);

  useEffect(() => {
    if (!loading && !user) void navigate({ to: "/login" });
  }, [loading, user, navigate]);

  useEffect(() => {
    if (!user) return;
    listUserAttempts(user.uid)
      .then(setAttempts)
      .catch(() => setAttempts([]));
  }, [user]);

  const stats = useMemo(() => {
    const list = attempts ?? [];
    const totalQ = list.reduce((a, b) => a + b.total, 0);
    const correct = list.reduce((a, b) => a + b.correct, 0);
    return {
      tests: list.length,
      totalQ,
      accuracy: totalQ ? Math.round((correct / totalQ) * 100) : 0,
      avgTime: list.length ? list.reduce((a, b) => a + b.avgSeconds, 0) / list.length : 0,
    };
  }, [attempts]);

  const trend = useMemo(
    () =>
      [...(attempts ?? [])]
        .sort((a, b) => a.createdAtMs - b.createdAtMs)
        .map((a, i) => ({ name: `T${i + 1}`, score: a.scorePercent, avg: Math.round(a.avgSeconds) })),
    [attempts],
  );

  const bySubject = useMemo(() => {
    const map = new Map<string, { total: number; correct: number }>();
    for (const a of attempts ?? [])
      for (const q of a.questions ?? []) {
        const cur = map.get(q.subject) ?? { total: 0, correct: 0 };
        map.set(q.subject, { total: cur.total + 1, correct: cur.correct + (q.correct ? 1 : 0) });
      }
    return [...map.entries()].map(([subject, v]) => ({
      subject: subject.split(" ")[0],
      accuracy: Math.round((v.correct / v.total) * 100),
    }));
  }, [attempts]);

  return (
    <div className="min-h-screen bg-halo">
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl font-extrabold">
              Hi {user?.displayName?.split(" ")[0] ?? "there"} 👋
            </h1>
            <p className="mt-1 text-muted-foreground">Here is how your preparation is going.</p>
          </div>
          <Button asChild variant="royal">
            <Link to="/practice">Start a new test</Link>
          </Button>
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Stat label="Tests taken" value={String(stats.tests)} />
          <Stat label="Questions solved" value={String(stats.totalQ)} />
          <Stat label="Overall accuracy" value={`${stats.accuracy}%`} />
          <Stat label="Avg time / question" value={formatSeconds(stats.avgTime)} />
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          <Panel title="Score trend">
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={trend}>
                <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
                <XAxis dataKey="name" fontSize={12} />
                <YAxis fontSize={12} domain={[0, 100]} />
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
                <Line type="monotone" dataKey="score" stroke="var(--primary)" strokeWidth={2.5} dot />
              </LineChart>
            </ResponsiveContainer>
          </Panel>

          <Panel title="Accuracy by subject">
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={bySubject}>
                <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
                <XAxis dataKey="subject" fontSize={12} />
                <YAxis fontSize={12} domain={[0, 100]} />
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
                <Bar dataKey="accuracy" fill="var(--primary)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Panel>
        </div>

        <h2 className="mt-10 font-display text-xl font-bold">Recent attempts</h2>
        <div className="mt-4 space-y-3">
          {(attempts ?? []).map((a) => (
            <div key={a.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card p-4 shadow-sm">
              <div>
                <p className="font-semibold">{a.label}</p>
                <p className="text-xs text-muted-foreground">
                  {new Date(a.createdAtMs).toLocaleString()} · {a.total} questions · {a.mode} mode
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary">{a.scorePercent}%</Badge>
                <Badge variant="outline">avg {formatSeconds(a.avgSeconds)}</Badge>
                <Badge variant="outline">max {formatSeconds(a.maxSeconds)}</Badge>
              </div>
            </div>
          ))}
          {attempts && !attempts.length && (
            <p className="text-muted-foreground">No attempts yet — take your first mock test.</p>
          )}
        </div>
      </main>
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
