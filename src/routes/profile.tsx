import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Camera, Save, Send, Trash2, UserRound } from "lucide-react";
import { SiteHeader, SiteFooter } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/lib/auth";
import {
  getProfile,
  imageToDataUrl,
  listMyQuestions,
  saveProfile,
  submitUserQuestion,
  type Profile,
  type UserQuestion,
} from "@/lib/profile";
import { SYLLABUS } from "@/data/syllabus";

export const Route = createFileRoute("/profile")({
  head: () => ({
    meta: [
      { title: "My Profile — PrepIQ.space" },
      {
        name: "description",
        content: "Manage your PrepIQ.space profile photo, name, phone and email, and submit new practice questions.",
      },
      { property: "og:title", content: "My Profile — PrepIQ.space" },
      { property: "og:description", content: "Edit your details and contribute questions to the MAH MCA CET bank." },
      { property: "og:type", content: "profile" },
      { name: "robots", content: "noindex" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ProfilePage,
});

const uniq = (xs: string[]) => [...new Set(xs)].sort();

function ProfilePage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [mine, setMine] = useState<UserQuestion[]>([]);

  useEffect(() => {
    if (!loading && !user) void navigate({ to: "/login" });
  }, [loading, user, navigate]);

  useEffect(() => {
    if (!user) return;
    getProfile(user.uid)
      .then((p) =>
        setProfile({
          ...p,
          name: p.name || user.displayName || "",
          email: p.email || user.email || "",
        }),
      )
      .catch(() => setProfile({ uid: user.uid, name: user.displayName ?? "", email: user.email ?? "" }));
    listMyQuestions(user.uid).then(setMine).catch(() => setMine([]));
  }, [user]);

  async function pickPhoto(file?: File) {
    if (!file) return;
    try {
      const dataUrl = await imageToDataUrl(file);
      setProfile((p) => (p ? { ...p, photo: dataUrl } : p));
      toast.success("Photo ready — press Save to keep it.");
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  async function save() {
    if (!user || !profile) return;
    setSaving(true);
    try {
      await saveProfile(user.uid, {
        name: (profile.name ?? "").trim().slice(0, 100),
        email: (profile.email ?? "").trim().slice(0, 255),
        phone: (profile.phone ?? "").trim().slice(0, 20),
        photo: profile.photo ?? "",
      });
      toast.success("Profile saved.");
    } catch {
      toast.error("Could not save your profile.");
    } finally {
      setSaving(false);
    }
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-halo">
      <SiteHeader />
      <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
        <h1 className="font-display text-3xl font-extrabold sm:text-4xl">My profile</h1>
        <p className="mt-2 text-muted-foreground">Keep your details current and share questions with other aspirants.</p>

        <section className="surface-card mt-8 p-6">
          <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-start">
            <div className="text-center">
              <div className="grid size-28 place-items-center overflow-hidden rounded-2xl border bg-muted">
                {profile?.photo ? (
                  <img src={profile.photo} alt="Profile" className="size-full object-cover" />
                ) : (
                  <UserRound className="size-10 text-muted-foreground" />
                )}
              </div>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                hidden
                onChange={(e) => void pickPhoto(e.target.files?.[0])}
              />
              <Button variant="soft" size="sm" className="mt-3" onClick={() => fileRef.current?.click()}>
                <Camera className="size-4" /> Change photo
              </Button>
            </div>

            <div className="grid w-full gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Full name</Label>
                <Input
                  value={profile?.name ?? ""}
                  maxLength={100}
                  onChange={(e) => setProfile((p) => (p ? { ...p, name: e.target.value } : p))}
                />
              </div>
              <div className="space-y-2">
                <Label>Phone number</Label>
                <Input
                  value={profile?.phone ?? ""}
                  maxLength={20}
                  placeholder="+91 …"
                  onChange={(e) => setProfile((p) => (p ? { ...p, phone: e.target.value } : p))}
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label>Email</Label>
                <Input
                  type="email"
                  value={profile?.email ?? ""}
                  maxLength={255}
                  onChange={(e) => setProfile((p) => (p ? { ...p, email: e.target.value } : p))}
                />
              </div>
              <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
                <Button variant="royal" onClick={save} disabled={saving}>
                  <Save className="size-4" /> {saving ? "Saving…" : "Save changes"}
                </Button>
                <Badge variant="secondary">{profile?.testsTaken ?? 0} tests</Badge>
                <Badge variant="outline">{profile?.questionsSolved ?? 0} questions solved</Badge>
              </div>
            </div>
          </div>
        </section>

        <SubmitQuestion
          uid={user.uid}
          userName={profile?.name ?? user.displayName ?? "Learner"}
          onSubmitted={(q) => setMine((m) => [q, ...m])}
        />

        {!!mine.length && (
          <section className="surface-card mt-8 p-6">
            <h2 className="font-display text-lg font-bold">My submitted questions</h2>
            <div className="mt-4 space-y-3">
              {mine.map((q) => (
                <div key={q.id} className="rounded-xl border p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="secondary">{q.subject}</Badge>
                    <Badge variant="outline">{q.topic}</Badge>
                    <Badge>{q.status === "approved" ? "Approved" : "Awaiting review"}</Badge>
                  </div>
                  <p className="mt-2 text-sm">{q.q}</p>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}

function SubmitQuestion({
  uid,
  userName,
  onSubmitted,
}: {
  uid: string;
  userName: string;
  onSubmitted: (q: UserQuestion) => void;
}) {
  const subjects = useMemo(() => uniq(SYLLABUS.map((r) => r.subject)), []);
  const [subject, setSubject] = useState(subjects[0] ?? "");
  const topics = useMemo(() => uniq(SYLLABUS.filter((r) => r.subject === subject).map((r) => r.topic)), [subject]);
  const [topic, setTopic] = useState(topics[0] ?? "");
  const [difficulty, setDifficulty] = useState("medium");
  const [q, setQ] = useState("");
  const [options, setOptions] = useState(["", "", "", ""]);
  const [answer, setAnswer] = useState(0);
  const [explanation, setExplanation] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setTopic(topics[0] ?? "");
  }, [topics]);

  async function submit() {
    if (!q.trim() || options.some((o) => !o.trim())) {
      toast.error("Add the question and all four options.");
      return;
    }
    setBusy(true);
    const payload: UserQuestion = {
      uid,
      userName,
      q: q.trim().slice(0, 1000),
      options: options.map((o) => o.trim().slice(0, 300)),
      answer,
      difficulty,
      explanation: explanation.trim().slice(0, 1000),
      subject,
      chapter: SYLLABUS.find((r) => r.topic === topic)?.chapter ?? topic,
      topic,
      status: "pending",
      createdAtMs: Date.now(),
    };
    try {
      await submitUserQuestion(payload);
      onSubmitted(payload);
      toast.success("Sent for review — an admin will approve it.");
      setQ("");
      setOptions(["", "", "", ""]);
      setExplanation("");
      setAnswer(0);
    } catch {
      toast.error("Could not send the question.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="surface-card mt-8 p-6">
      <h2 className="font-display text-lg font-bold">Submit a new question</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Share a question you liked. It goes to the admin for approval before joining the main bank.
      </p>

      <div className="mt-5 grid gap-4 sm:grid-cols-3">
        <div className="space-y-2">
          <Label>Subject</Label>
          <Select value={subject} onValueChange={setSubject}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="max-h-72">
              {subjects.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Topic</Label>
          <Select value={topic} onValueChange={setTopic}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="max-h-72">
              {topics.map((t) => (
                <SelectItem key={t} value={t}>
                  {t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Difficulty</Label>
          <Select value={difficulty} onValueChange={setDifficulty}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {["easy", "medium", "hard"].map((d) => (
                <SelectItem key={d} value={d}>
                  {d}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2 sm:col-span-3">
          <Label>Question</Label>
          <Textarea rows={3} maxLength={1000} value={q} onChange={(e) => setQ(e.target.value)} />
        </div>

        {options.map((o, i) => (
          <div key={i} className="space-y-2">
            <Label>
              Option {i + 1} {answer === i && <span className="text-royal">· correct</span>}
            </Label>
            <div className="flex gap-2">
              <Input
                value={o}
                maxLength={300}
                onChange={(e) => setOptions((prev) => prev.map((v, j) => (j === i ? e.target.value : v)))}
              />
              <Button
                type="button"
                variant={answer === i ? "royal" : "outline"}
                size="icon"
                onClick={() => setAnswer(i)}
                aria-label={`Mark option ${i + 1} correct`}
              >
                ✓
              </Button>
            </div>
          </div>
        ))}

        <div className="space-y-2 sm:col-span-3">
          <Label>Explanation (optional)</Label>
          <Textarea
            rows={2}
            maxLength={1000}
            value={explanation}
            onChange={(e) => setExplanation(e.target.value)}
          />
        </div>

        <div className="flex gap-2 sm:col-span-3">
          <Button variant="royal" onClick={submit} disabled={busy} className="flex-1">
            <Send className="size-4" /> {busy ? "Sending…" : "Submit for review"}
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              setQ("");
              setOptions(["", "", "", ""]);
              setExplanation("");
            }}
          >
            <Trash2 className="size-4" /> Clear
          </Button>
        </div>
      </div>
    </section>
  );
}
