import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { SiteHeader } from "@/components/site-header";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { SYLLABUS, SUBJECT_MARKS } from "@/data/syllabus";

export const Route = createFileRoute("/syllabus")({
  head: () => ({
    meta: [
      { title: "MAH MCA CET 2027 Syllabus — 83 Topics" },
      { name: "description", content: "Full MAH MCA CET 2027 syllabus: Mathematics, Logical Reasoning, English and Computer Concepts broken into 83 searchable topics." },
      { property: "og:title", content: "MAH MCA CET 2027 Syllabus — 83 Topics" },
      { property: "og:description", content: "Subject-wise chapters, topics, weightage and priority for MAH MCA CET 2027." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SyllabusPage,
});

function SyllabusPage() {
  const [q, setQ] = useState("");
  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return SYLLABUS;
    return SYLLABUS.filter((r) =>
      `${r.subject} ${r.group} ${r.chapter} ${r.topic}`.toLowerCase().includes(needle),
    );
  }, [q]);

  const subjects = useMemo(() => {
    const map = new Map<string, typeof SYLLABUS>();
    for (const r of rows) map.set(r.subject, [...(map.get(r.subject) ?? []), r]);
    return [...map.entries()];
  }, [rows]);

  return (
    <div className="min-h-screen bg-halo">
      <SiteHeader />
      <main className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
        <h1 className="font-display text-3xl font-extrabold sm:text-4xl">Complete syllabus</h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          {SYLLABUS.length} topics across four subjects, mapped to the official MAH MCA CET pattern.
        </p>

        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search a topic, chapter or subject…"
          className="mt-6 max-w-md"
        />

        <div className="mt-10 space-y-10">
          {subjects.map(([subject, list]) => (
            <section key={subject}>
              <div className="flex flex-wrap items-center gap-3">
                <h2 className="font-display text-xl font-bold">{subject}</h2>
                <Badge variant="secondary">{SUBJECT_MARKS[subject] ?? "—"} marks</Badge>
                <Badge variant="outline">{list.length} topics</Badge>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {list.map((r) => (
                  <article key={r.id} className="rounded-xl border bg-card p-4 shadow-sm">
                    <p className="text-xs tracking-wide text-muted-foreground uppercase">{r.chapter}</p>
                    <h3 className="mt-1 font-semibold">{r.topic}</h3>
                    <div className="mt-3 flex gap-2 text-xs">
                      <Badge variant="secondary">Weight: {r.weightage}</Badge>
                      <Badge variant="outline">Priority: {r.priority}</Badge>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          ))}
          {!rows.length && <p className="text-muted-foreground">No topics match “{q}”.</p>}
        </div>
      </main>
    </div>
  );
}
