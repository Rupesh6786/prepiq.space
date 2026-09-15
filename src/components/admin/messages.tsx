import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Check, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  deleteSupportMessage,
  listSupportMessages,
  markMessageHandled,
  type SupportMessage,
} from "@/lib/profile";

const RANGES = {
  all: Number.MAX_SAFE_INTEGER,
  "24h": 24 * 3600_000,
  "7d": 7 * 24 * 3600_000,
  "30d": 30 * 24 * 3600_000,
};

export function Messages() {
  const [rows, setRows] = useState<SupportMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState<keyof typeof RANGES>("all");
  const [status, setStatus] = useState<"all" | "open" | "handled">("all");
  const [search, setSearch] = useState("");

  useEffect(() => {
    listSupportMessages()
      .then(setRows)
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const since = Date.now() - RANGES[range];
    const term = search.trim().toLowerCase();
    return rows.filter(
      (m) =>
        (range === "all" || (m.createdAtMs ?? 0) >= since) &&
        (status === "all" || (status === "handled" ? m.handled : !m.handled)) &&
        (!term ||
          `${m.name} ${m.email} ${m.subject} ${m.message}`.toLowerCase().includes(term)),
    );
  }, [rows, range, status, search]);

  async function toggleHandled(m: SupportMessage) {
    if (!m.id) return;
    await markMessageHandled(m.id, !m.handled);
    setRows((r) => r.map((x) => (x.id === m.id ? { ...x, handled: !m.handled } : x)));
  }

  async function remove(id?: string) {
    if (!id) return;
    await deleteSupportMessage(id);
    setRows((r) => r.filter((x) => x.id !== id));
    toast.success("Message deleted.");
  }

  if (loading) return <p className="text-muted-foreground">Loading messages…</p>;

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-3">
        <Select value={range} onValueChange={(v) => setRange(v as keyof typeof RANGES)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All time</SelectItem>
            <SelectItem value="24h">Last 24 hours</SelectItem>
            <SelectItem value="7d">Last 7 days</SelectItem>
            <SelectItem value="30d">Last 30 days</SelectItem>
          </SelectContent>
        </Select>
        <Select value={status} onValueChange={(v) => setStatus(v as typeof status)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All messages</SelectItem>
            <SelectItem value="open">Open</SelectItem>
            <SelectItem value="handled">Handled</SelectItem>
          </SelectContent>
        </Select>
        <Input placeholder="Search name, email or text…" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      <div className="space-y-3">
        {filtered.map((m) => (
          <div key={m.id} className="rounded-2xl border bg-card p-5 shadow-sm">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary">{m.subject}</Badge>
              <Badge variant={m.handled ? "outline" : "default"}>{m.handled ? "Handled" : "Open"}</Badge>
              <span className="text-xs text-muted-foreground">
                {new Date(m.createdAtMs ?? 0).toLocaleString()}
              </span>
            </div>
            <p className="mt-2 text-sm font-semibold">
              {m.name} · <span className="font-normal text-muted-foreground">{m.email}</span>
            </p>
            <p className="mt-2 text-sm whitespace-pre-wrap">{m.message}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button variant="soft" size="sm" onClick={() => toggleHandled(m)}>
                <Check className="size-4" /> {m.handled ? "Mark open" : "Mark handled"}
              </Button>
              <Button variant="outline" size="sm" onClick={() => remove(m.id)}>
                <Trash2 className="size-4" /> Delete
              </Button>
            </div>
          </div>
        ))}
        {!filtered.length && <p className="text-muted-foreground">No messages match these filters.</p>}
      </div>
    </div>
  );
}
