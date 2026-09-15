import { useRef, useState } from "react";
import { toast } from "sonner";
import { Bold, Braces, Code2, Italic, ListOrdered, List, Radical, Save, Sigma, Superscript, Subscript, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { RichInline, RichText } from "@/components/rich-text";
import { updateStoredQuestion, type StoredQuestion } from "@/lib/attempts";

type EditorMode = "simple" | "equation" | "code";

const MODES: { id: EditorMode; label: string; hint: string }[] = [
  { id: "simple", label: "Simple editor", hint: "Lists and basic text formatting." },
  { id: "equation", label: "Contains an equation", hint: "Maths, symbols, matrices and operators." },
  { id: "code", label: "Contains code", hint: "Inline or multi-line programming snippets." },
];

const GREEK_SYMBOLS = [
  ["α", "\\alpha"], ["β", "\\beta"], ["γ", "\\gamma"], ["δ", "\\delta"],
  ["θ", "\\theta"], ["λ", "\\lambda"], ["μ", "\\mu"], ["π", "\\pi"],
  ["σ", "\\sigma"], ["φ", "\\phi"], ["ω", "\\omega"], ["Δ", "\\Delta"],
] as const;

const OPERATORS = [
  ["≤", "\\le"], ["≥", "\\ge"], ["≠", "\\neq"], ["±", "\\pm"],
  ["×", "\\times"], ["÷", "\\div"], ["∞", "\\infty"], ["→", "\\to"],
] as const;

/**
 * Full-screen question studio. Formatting is purely presentational — the
 * stored fields (q, options, answer, explanation) keep the same structure.
 */
export function QuestionStudio({
  question,
  onClose,
  onSaved,
}: {
  question: StoredQuestion;
  onClose: () => void;
  onSaved: (q: StoredQuestion) => void;
}) {
  const [draft, setDraft] = useState<StoredQuestion>({ ...question, options: [...question.options] });
  const [modes, setModes] = useState<EditorMode[]>(["simple"]);
  const [busy, setBusy] = useState(false);
  const [target, setTarget] = useState<"q" | "explanation" | number>("q");
  const areaRef = useRef<HTMLTextAreaElement>(null);

  const value =
    target === "q" ? draft.q : target === "explanation" ? (draft.explanation ?? "") : (draft.options[target] ?? "");

  function setValue(next: string) {
    if (target === "q") setDraft({ ...draft, q: next });
    else if (target === "explanation") setDraft({ ...draft, explanation: next });
    else setDraft({ ...draft, options: draft.options.map((o, i) => (i === target ? next : o)) });
  }

  function insert(before: string, after = "", block = false) {
    const el = areaRef.current;
    const start = el?.selectionStart ?? value.length;
    const end = el?.selectionEnd ?? value.length;
    const selected = value.slice(start, end);
    const pad = block && start > 0 && value[start - 1] !== "\n" ? "\n" : "";
    const next = `${value.slice(0, start)}${pad}${before}${selected}${after}${value.slice(end)}`;
    setValue(next);
    requestAnimationFrame(() => {
      el?.focus();
      const pos = start + pad.length + before.length + selected.length;
      el?.setSelectionRange(pos, pos);
    });
  }

  function toggleMode(mode: EditorMode) {
    setModes((current) =>
      current.includes(mode) ? current.filter((item) => item !== mode) : [...current, mode],
    );
  }

  async function save() {
    if (!draft.id) return;
    if (draft.options.some((o) => !o.trim()) || !draft.q.trim()) {
      toast.error("Question and all four options are required");
      return;
    }
    setBusy(true);
    try {
      await updateStoredQuestion(draft.id, draft);
      onSaved(draft);
      toast.success("Question saved");
      onClose();
    } catch {
      toast.error("Could not save the question");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 p-2 sm:p-6">
      <div className="mx-auto w-full max-w-6xl rounded-2xl border bg-card shadow-lg">
        <header className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-b px-4 py-3 sm:px-6">
          <div className="min-w-0">
            <h3 className="truncate font-display text-base font-bold sm:text-lg">Question editor</h3>
            <p className="truncate text-xs text-muted-foreground">
              {draft.subject} · {draft.topic}
            </p>
          </div>
          <div className="flex shrink-0 gap-2">
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="size-4" />
            </Button>
          </div>
        </header>

        <div className="grid gap-6 p-4 sm:p-6 lg:grid-cols-2">
          <div className="min-w-0 space-y-5">
            <div className="rounded-xl border bg-muted/30 p-4">
              <p className="text-sm font-semibold">Editor mode</p>
              <div className="mt-3 grid gap-3 sm:grid-cols-3">
                {MODES.map((mode) => (
                  <label
                    key={mode.id}
                    className={`flex cursor-pointer items-start gap-2 rounded-lg border p-3 text-sm transition-colors ${modes.includes(mode.id) ? "border-primary bg-primary/10" : "bg-background"}`}
                  >
                    <Checkbox
                      checked={modes.includes(mode.id)}
                      onCheckedChange={() => toggleMode(mode.id)}
                      className="mt-0.5"
                    />
                    <span className="min-w-0">
                      <span className="block font-medium">{mode.label}</span>
                      <span className="mt-0.5 block text-xs text-muted-foreground">{mode.hint}</span>
                    </span>
                  </label>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Chip active={target === "q"} onClick={() => setTarget("q")}>Question</Chip>
              {draft.options.map((_, i) => (
                <Chip key={i} active={target === i} onClick={() => setTarget(i)}>
                  Option {String.fromCharCode(65 + i)}
                </Chip>
              ))}
              <Chip active={target === "explanation"} onClick={() => setTarget("explanation")}>
                Explanation
              </Chip>
            </div>

            {modes.length === 0 && (
              <p className="rounded-lg border border-dashed p-3 text-sm text-muted-foreground">
                Select an editor mode to show its formatting controls.
              </p>
            )}

            {modes.includes("simple") && (
              <Toolbar title="Simple editor / text formatting">
                <Tool icon={ListOrdered} label="Numbered" onClick={() => insert("\n1. ", "", true)} />
                <Tool icon={List} label="Bullet" onClick={() => insert("\n- ", "", true)} />
                <Tool icon={Bold} label="Bold" onClick={() => insert("**", "**")} />
                <Tool icon={Italic} label="Italic" onClick={() => insert("*", "*")} />
              </Toolbar>
            )}

            {modes.includes("equation") && (
              <Toolbar title="Equation tools">
                <Tool icon={Sigma} label="Equation" onClick={() => insert("\\(", "\\)")} />
                <Tool icon={Superscript} label="Power" onClick={() => insert("^{", "}")} />
                <Tool icon={Subscript} label="Subscript" onClick={() => insert("_{", "}")} />
                <Tool icon={Radical} label="Square root" onClick={() => insert("\\sqrt{", "}")} />
                <Tool symbol="a/b" label="Fraction" onClick={() => insert("\\frac{", "}{}") } />
                <Tool symbol="∫" label="Integral" onClick={() => insert("\\int_{a}^{b} ")} />
                <Tool symbol="lim" label="Limit" onClick={() => insert("\\lim_{x \\to 0} ")} />
                <Tool symbol="[::]" label="Matrix" onClick={() => insert("\\begin{bmatrix} a & b \\\\ c & d \\end{bmatrix}")} />
                <Tool symbol="v⃗" label="Vector" onClick={() => insert("\\vec{", "}")} />
                <SymbolPicker label="Greek symbols" symbol="αβ" items={GREEK_SYMBOLS} onPick={(item) => insert(item)} />
                <SymbolPicker label="Operators" symbol="±" items={OPERATORS} onPick={(item) => insert(item)} />
              </Toolbar>
            )}

            {modes.includes("code") && (
              <Toolbar title="Code tools">
                <Tool icon={Code2} label="Inline code" onClick={() => insert("`", "`")} />
                <Tool icon={Braces} label="Code block" onClick={() => insert("\n```\n", "\n```\n", true)} />
              </Toolbar>
            )}

            <div className="space-y-2">
              <Label>
                {target === "q"
                  ? "Question text"
                  : target === "explanation"
                    ? "Explanation"
                    : `Option ${String.fromCharCode(65 + (target as number))}`}
              </Label>
              <Textarea
                ref={areaRef}
                rows={typeof target === "number" ? 3 : 8}
                value={value}
                onChange={(e) => setValue(e.target.value)}
                className="font-mono text-sm"
              />
              {typeof target === "number" && (
                <Button
                  size="sm"
                  variant={draft.answer === target ? "royal" : "soft"}
                  onClick={() => setDraft({ ...draft, answer: target })}
                >
                  {draft.answer === target ? "This is the correct option" : "Mark as correct"}
                </Button>
              )}
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Topic</Label>
                <Input value={draft.topic} onChange={(e) => setDraft({ ...draft, topic: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Chapter</Label>
                <Input
                  value={draft.chapter ?? ""}
                  onChange={(e) => setDraft({ ...draft, chapter: e.target.value })}
                />
              </div>
            </div>
          </div>

          <div className="min-w-0">
            <p className="text-sm font-semibold">Live preview — exactly what learners see</p>
            <article className="mt-3 rounded-2xl border bg-background p-5 shadow-sm">
              <RichText text={draft.q} className="text-base font-semibold" />
              <div className="mt-4 space-y-2">
                {draft.options.map((o, i) => (
                  <div
                    key={i}
                    className={`flex items-start gap-3 rounded-xl border p-3 text-sm ${i === draft.answer ? "border-primary bg-primary/5" : ""}`}
                  >
                    <span className="grid size-6 shrink-0 place-items-center rounded-lg border text-xs">
                      {String.fromCharCode(65 + i)}
                    </span>
                    <RichInline text={o} className="min-w-0" />
                    {i === draft.answer && <Badge variant="secondary" className="ml-auto">Correct</Badge>}
                  </div>
                ))}
              </div>
              {draft.explanation && (
                <RichText text={draft.explanation} className="mt-4 text-sm text-muted-foreground" />
              )}
            </article>
          </div>
        </div>

        <footer className="flex justify-end gap-3 border-t px-4 py-3 sm:px-6">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="royal" onClick={() => void save()} disabled={busy}>
            <Save className="size-4" /> {busy ? "Saving…" : "Save question"}
          </Button>
        </footer>
      </div>
    </div>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <Button
      type="button"
      size="sm"
      variant="outline"
      onClick={onClick}
      className={active ? "border-primary bg-primary/10 text-primary" : "text-muted-foreground"}
    >
      {children}
    </Button>
  );
}

function Toolbar({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border bg-muted/20 p-2">
      <p className="mb-2 px-1 text-xs font-semibold text-muted-foreground">{title}</p>
      <div className="flex flex-wrap gap-1.5">{children}</div>
    </div>
  );
}

function Tool({
  icon: Icon,
  symbol,
  label,
  onClick,
}: {
  icon?: React.ComponentType<{ className?: string }>;
  symbol?: string;
  label: string;
  onClick: () => void;
}) {
  return (
    <Button
      type="button"
      size="sm"
      variant="outline"
      onClick={onClick}
      title={label}
      className="text-muted-foreground hover:text-foreground"
    >
      {Icon ? <Icon className="size-3.5" /> : <span className="font-mono text-xs font-bold">{symbol}</span>} {label}
    </Button>
  );
}

function SymbolPicker({
  label,
  symbol,
  items,
  onPick,
}: {
  label: string;
  symbol: string;
  items: ReadonlyArray<readonly [string, string]>;
  onPick: (value: string) => void;
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button type="button" size="sm" variant="outline" title={label} className="text-muted-foreground hover:text-foreground">
          <span className="font-serif text-xs font-bold">{symbol}</span> {label}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-2" align="start">
        <p className="px-2 pb-2 text-xs font-semibold text-muted-foreground">{label}</p>
        <div className="grid grid-cols-4 gap-1">
          {items.map(([display, value]) => (
            <Button key={value} type="button" variant="ghost" size="sm" title={value} onClick={() => onPick(value)}>
              {display}
            </Button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
