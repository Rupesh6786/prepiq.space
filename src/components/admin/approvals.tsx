import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { approveUserQuestion, listUserQuestions, rejectUserQuestion, type UserQuestion } from "@/lib/profile";
import { invalidateQuestionCache } from "@/lib/questions";

export function Approvals() {
  const [rows, setRows] = useState<UserQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    listUserQuestions()
      .then(setRows)
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  }, []);

  async function approve(item: UserQuestion) {
    setBusy(item.id ?? "");
    try {
      await approveUserQuestion(item);
      invalidateQuestionCache();
      setRows((r) => r.filter((x) => x.id !== item.id));
      toast.success("Added to the main question bank.");
    } catch {
      toast.error("Could not approve this question.");
    } finally {
      setBusy(null);
    }
  }

  async function reject(id?: string) {
    if (!id) return;
    setBusy(id);
    try {
      await rejectUserQuestion(id);
      setRows((r) => r.filter((x) => x.id !== id));
      toast.success("Question rejected.");
    } finally {
      setBusy(null);
    }
  }

  if (loading) return <p className="text-muted-foreground">Loading submissions…</p>;
  if (!rows.length) return <p className="text-muted-foreground">No questions are waiting for review.</p>;

  return (
    <div className="space-y-4">
      {rows.map((item) => (
        <div key={item.id} className="rounded-2xl border bg-card p-5 shadow-sm">
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary">{item.subject}</Badge>
            <Badge variant="outline">{item.topic}</Badge>
            <Badge variant="outline">{item.difficulty}</Badge>
            <Badge>by {item.userName || "Learner"}</Badge>
          </div>
          <p className="mt-3 font-medium">{item.q}</p>
          <ul className="mt-3 space-y-1.5">
            {item.options.map((o, i) => (
              <li
                key={i}
                className={`rounded-lg border px-3 py-2 text-sm ${i === item.answer ? "border-success/40 bg-success/10 font-semibold" : ""}`}
              >
                {String.fromCharCode(65 + i)}. {o}
              </li>
            ))}
          </ul>
          {item.explanation && <p className="mt-3 text-sm text-muted-foreground">{item.explanation}</p>}
          <div className="mt-4 flex flex-wrap gap-2">
            <Button variant="royal" size="sm" disabled={busy === item.id} onClick={() => approve(item)}>
              <Check className="size-4" /> Approve
            </Button>
            <Button variant="outline" size="sm" disabled={busy === item.id} onClick={() => reject(item.id)}>
              <X className="size-4" /> Reject
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}
