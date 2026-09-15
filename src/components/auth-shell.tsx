import { Link } from "@tanstack/react-router";
import { Crown, Sparkles, ShieldCheck, Timer } from "lucide-react";
import type { ReactNode } from "react";

const POINTS = [
  { icon: Sparkles, text: "1,600+ exam-style MCQs across 83 topics" },
  { icon: Timer, text: "Timed or question-count based mock tests" },
  { icon: ShieldCheck, text: "Admin console unlocked by Firebase UID" },
];

export function AuthShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="relative hidden overflow-hidden bg-[image:var(--gradient-royal)] p-12 lg:flex lg:flex-col lg:justify-between">
        <div className="animate-float pointer-events-none absolute -top-20 -left-16 size-80 rounded-full bg-white/10 blur-3xl" />
        <div
          className="animate-float pointer-events-none absolute right-0 bottom-10 size-72 rounded-full opacity-40 blur-3xl"
          style={{ background: "var(--gradient-gold)", animationDelay: "2s" }}
        />
        <Link to="/" className="relative flex items-center gap-3 text-primary-foreground">
          <span className="grid size-10 place-items-center rounded-xl bg-white/15">
            <Crown className="size-5" />
          </span>
          <span className="font-display text-xl font-bold">PrepIQ.space</span>
        </Link>
        <div className="relative">
          <h2 className="font-display text-4xl leading-tight font-extrabold text-balance text-primary-foreground">
            The calmest way to walk into MAH MCA CET 2027.
          </h2>
          <ul className="mt-8 space-y-4">
            {POINTS.map((p, i) => (
              <li
                key={p.text}
                className="animate-rise flex items-center gap-3 text-primary-foreground/85"
                style={{ animationDelay: `${i * 120}ms` }}
              >
                <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-white/12">
                  <p.icon className="size-4" />
                </span>
                <span className="text-sm">{p.text}</span>
              </li>
            ))}
          </ul>
        </div>
        <p className="relative text-xs text-primary-foreground/60">
          Exam window · 4th week of March 2027
        </p>
      </div>

      <div className="relative flex items-center justify-center bg-halo px-4 py-12 sm:px-8">
        <div className="animate-rise w-full max-w-md">
          <Link to="/" className="mb-8 flex items-center gap-2.5 lg:hidden">
            <span className="grid size-9 place-items-center rounded-xl bg-[image:var(--gradient-royal)] text-primary-foreground">
              <Crown className="size-4.5" />
            </span>
            <span className="font-display text-lg font-bold">PrepIQ.space</span>
          </Link>
          <h1 className="text-3xl font-bold">{title}</h1>
          <p className="mt-2 text-sm text-muted-foreground">{subtitle}</p>
          <div className="mt-8">{children}</div>
        </div>
      </div>
    </div>
  );
}

export function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <path
        fill="#4285F4"
        d="M23.5 12.3c0-.9-.1-1.5-.2-2.2H12v4h6.6c-.1 1.1-.9 2.8-2.5 3.9l3.8 3c2.3-2.1 3.6-5.2 3.6-8.7z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.2 0 6-1.1 8-2.9l-3.8-3c-1 .7-2.4 1.2-4.2 1.2-3.2 0-5.9-2.1-6.9-5l-4 3.1C3.1 21.3 7.2 24 12 24z"
      />
      <path
        fill="#FBBC05"
        d="M5.1 14.3c-.2-.7-.4-1.5-.4-2.3s.1-1.6.4-2.3l-4-3.1C.4 8.2 0 10 0 12s.4 3.8 1.1 5.4l4-3.1z"
      />
      <path
        fill="#EA4335"
        d="M12 4.8c2.3 0 3.8 1 4.7 1.8l3.4-3.3C18 1.2 15.2 0 12 0 7.2 0 3.1 2.7 1.1 6.6l4 3.1C6.1 6.9 8.8 4.8 12 4.8z"
      />
    </svg>
  );
}
