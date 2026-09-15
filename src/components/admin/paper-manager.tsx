import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { listStoredQuestions, type StoredQuestion } from "@/lib/attempts";
import { deletePaper, listPapers, savePaper, type Paper } from "@/lib/profile";

const uniq = (xs: (string | undefined)[]) => [...new Set(xs.filter(Boolean) as string[])].sort();

type Selections = {
  sources: string[];
  subjects: string[];
  chapters: string[];
  topics: string[];
  difficulties: string[];
};

const EMPTY: Selections = { sources: [], subjects: [], chapters: [], topics: [], difficulties: [] };

export function PaperManager() {
  const [rows, setRows] = useState<StoredQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [sel, setSel] = useState<Selections>(EMPTY);
  const [papers, setPapers] = useState<Paper[]>([]);

  const [title, setTitle] = useState("");
  const [kind, setKind] = useState<"PYQ" | "MOCK">("PYQ");
  const [minutes, setMinutes] = useState(90);
  const [total, setTotal] = useState(100);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    listStoredQuestions(5000)
      .then(setRows)
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
    listPapers().then(setPapers).catch(() => setPapers([]));
  }, []);

  const options = useMemo(
    () => ({
      sources: uniq(rows.map((r) => r.source ?? "manual")),
      subjects: uniq(rows.map((r) => r.subject)),
      chapters: uniq(rows.map((r) => r.chapter ?? r.topic)),
      topics: uniq(rows.map((r) => r.topic)),
      difficulties: uniq(rows.map((r) => r.difficulty)),
    }),
    [rows],
  );

  const matched = useMemo(() => {
    const has = (list: string[], v: string) => !list.length || list.includes(v);
    return rows.filter(
      (r) =>
        has(sel.sources, r.source ?? "manual") &&
        has(sel.subjects, r.subject) &&
        has(sel.chapters, r.chapter ?? r.topic) &&
        has(sel.topics, r.topic) &&
        has(sel.difficulties, r.difficulty),
    );
  }, [rows, sel]);

  function toggle(group: keyof Selections, value: string) {
    setSel((s) => {
      const list = s[group];
      return { ...s, [group]: list.includes(value) ? list.filter((v) => v !== value) : [...list, value] };
    });
  }

  async function create() {
    if (!title.trim()) {
      toast.error("Give the paper a title.");
      return;
    }
    if (!matched.length) {
      toast.error("No questions match the chosen filters.");
      return;
    }
    setSaving(true);
    try {
      await savePaper({
        title: title.trim().slice(0, 120),
        kind,
        minutes: Math.max(5, minutes),
        total: Math.min(Math.max(1, total), matched.length),
        filters: {
          sources: sel.sources,
          subjects: sel.subjects,
          chapters: sel.chapters,
          topics: sel.topics,
          difficulties: sel.difficulties,
        },
        createdAtMs: Date.now(),
      });
      toast.success("Paper published — learners will see it on the practice page.");
      setTitle("");
      setPapers(await listPapers());
    } catch {
      toast.error("Could not save the paper.");
    } finally {
      setSaving(false);
    }
  }

  async function remove(id?: string) {
    if (!id) return;
    await deletePaper(id);
    setPapers((p) => p.filter((x) => x.id !== id));
    toast.success("Paper removed.");
  }

  if (loading) return <p className="text-muted-foreground">Loading questions…</p>;

  return (
    <div className="space-y-8">
      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <aside className="space-y-5 rounded-2xl border bg-card p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="font-display font-bold">Filters</h3>
            <Button variant="ghost" size="sm" onClick={() => setSel(EMPTY)}>
              Reset
            </Button>
          </div>
          <CheckGroup label="Source" values={options.sources} selected={sel.sources} onToggle={(v) => toggle("sources", v)} />
          <CheckGroup label="Subject" values={options.subjects} selected={sel.subjects} onToggle={(v) => toggle("subjects", v)} />
          <CheckGroup label="Chapter" values={options.chapters} selected={sel.chapters} onToggle={(v) => toggle("chapters", v)} />
          <CheckGroup label="Topic / sub-topic" values={options.topics} selected={sel.topics} onToggle={(v) => toggle("topics", v)} />
          <CheckGroup
            label="Difficulty"
            values={options.difficulties}
            selected={sel.difficulties}
            onToggle={(v) => toggle("difficulties", v)}
          />
        </aside>

        <div className="min-w-0 space-y-5">
          <div className="rounded-2xl border bg-card p-5 shadow-sm">
            <h3 className="font-display font-bold">Assign a new paper</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {matched.length} questions selected by the current filters.
            </p>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label>Title</Label>
                <Input
                  value={title}
                  maxLength={120}
                  placeholder="MAH MCA CET 2024 paper"
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Type</Label>
                <div className="flex gap-2">
                  {(["PYQ", "MOCK"] as const).map((k) => (
                    <Button
                      key={k}
                      variant={kind === k ? "royal" : "outline"}
                      className="flex-1"
                      onClick={() => setKind(k)}
                    >
                      {k}
                    </Button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Minutes</Label>
                  <Input type="number" min={5} value={minutes} onChange={(e) => setMinutes(Number(e.target.value))} />
                </div>
                <div className="space-y-2">
                  <Label>Questions</Label>
                  <Input type="number" min={1} value={total} onChange={(e) => setTotal(Number(e.target.value))} />
                </div>
              </div>
              <div className="sm:col-span-2">
                <Button variant="royal" className="w-full" onClick={create} disabled={saving}>
                  <Plus className="size-4" /> {saving ? "Publishing…" : "Publish paper"}
                </Button>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border bg-card p-5 shadow-sm">
            <h3 className="font-display font-bold">Matching questions</h3>
            <ScrollArea className="mt-3 h-80 pr-3">
              <div className="space-y-3">
                {matched.slice(0, 200).map((q) => (
                  <div key={q.id} className="rounded-xl border p-3">
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="secondary">{q.source ?? "manual"}</Badge>
                      <Badge variant="outline">{q.subject}</Badge>
                      <Badge variant="outline">{q.topic}</Badge>
                    </div>
                    <p className="mt-2 text-sm">{q.q}</p>
                    <p className="mt-1 text-xs text-success">Correct: {q.options[q.answer]}</p>
                  </div>
                ))}
                {!matched.length && <p className="text-sm text-muted-foreground">Nothing matches yet.</p>}
              </div>
            </ScrollArea>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border bg-card p-5 shadow-sm">
        <h3 className="font-display font-bold">Published papers</h3>
        <div className="mt-4 space-y-3">
          {papers.map((p) => (
            <div key={p.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border p-4">
              <div>
                <p className="font-semibold">{p.title}</p>
                <p className="text-xs text-muted-foreground">
                  {p.kind} · {p.total} questions · {p.minutes} min
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={() => remove(p.id)}>
                <Trash2 className="size-4" /> Delete
              </Button>
            </div>
          ))}
          {!papers.length && <p className="text-sm text-muted-foreground">No papers published yet.</p>}
        </div>
      </div>
    </div>
  );
}

function CheckGroup({
  label,
  values,
  selected,
  onToggle,
}: {
  label: string;
  values: string[];
  selected: string[];
  onToggle: (v: string) => void;
}) {
  return (
    <div>
      <p className="mb-2 flex items-center gap-2 text-xs font-semibold tracking-wide uppercase">
        {label}
        {!!selected.length && <Badge variant="secondary">{selected.length}</Badge>}
      </p>
      <ScrollArea className="h-36 rounded-lg border p-2">
        <div className="space-y-1.5">
          {values.map((v) => (
            <label key={v} className="flex cursor-pointer items-center gap-2 text-sm">
              <Checkbox checked={selected.includes(v)} onCheckedChange={() => onToggle(v)} />
              <span className="truncate">{v}</span>
            </label>
          ))}
          {!values.length && <p className="text-xs text-muted-foreground">Nothing yet.</p>}
        </div>
      </ScrollArea>
    </div>
  );
}
