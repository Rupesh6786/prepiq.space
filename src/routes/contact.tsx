import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Mail, Send } from "lucide-react";
import { SiteHeader, SiteFooter } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/lib/auth";
import { sendSupportMessage } from "@/lib/profile";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact & Support — PrepIQ.space" },
      {
        name: "description",
        content:
          "Reach the PrepIQ.space team with questions, feedback or issues about MAH MCA CET practice tests and your account.",
      },
      { property: "og:title", content: "Contact & Support — PrepIQ.space" },
      {
        property: "og:description",
        content: "Send a message to the PrepIQ.space team — we answer support requests from learners.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ContactPage,
});

function ContactPage() {
  const { user } = useAuth();
  const [name, setName] = useState(user?.displayName ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !message.trim()) {
      toast.error("Please fill in your name, email and message.");
      return;
    }
    setSending(true);
    try {
      await sendSupportMessage({
        uid: user?.uid ?? "",
        name: name.trim().slice(0, 100),
        email: email.trim().slice(0, 255),
        subject: subject.trim().slice(0, 150) || "General enquiry",
        message: message.trim().slice(0, 2000),
      });
      toast.success("Message sent — we'll get back to you soon.");
      setSubject("");
      setMessage("");
    } catch {
      toast.error("Could not send the message. Please try again.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="min-h-screen bg-halo">
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <span className="inline-flex items-center gap-2 rounded-full border border-gold/40 bg-gold-soft px-4 py-1.5 text-xs font-semibold text-royal uppercase">
          <Mail className="size-3.5" /> Support
        </span>
        <h1 className="mt-5 font-display text-3xl font-extrabold sm:text-4xl">Contact us</h1>
        <p className="mt-2 text-muted-foreground">
          Found a wrong answer, need help with your account, or want a topic added? Send us a note.
        </p>

        <form onSubmit={submit} className="surface-card mt-8 grid gap-5 p-6 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Your name</Label>
            <Input value={name} maxLength={100} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Email</Label>
            <Input type="email" value={email} maxLength={255} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label>Subject</Label>
            <Input
              value={subject}
              maxLength={150}
              placeholder="What is this about?"
              onChange={(e) => setSubject(e.target.value)}
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label>Message</Label>
            <Textarea
              rows={6}
              maxLength={2000}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Tell us what's going on…"
            />
          </div>
          <div className="sm:col-span-2">
            <Button type="submit" variant="royal" size="lg" className="w-full" disabled={sending}>
              <Send className="size-4" /> {sending ? "Sending…" : "Send message"}
            </Button>
          </div>
        </form>
      </main>
      <SiteFooter />
    </div>
  );
}
