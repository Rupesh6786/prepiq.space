import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { AuthShell, GoogleIcon } from "@/components/auth-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { friendlyAuthError, useAuth } from "@/lib/auth";
import { isAdminUid } from "@/lib/admins";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Log in — PrepIQ.space MAH MCA CET Prep" },
      { name: "description", content: "Sign in to PrepIQ.space to take MAH MCA CET mock tests and track your progress." },
      { property: "og:title", content: "Log in — PrepIQ.space" },
      { property: "og:description", content: "Sign in to continue your MAH MCA CET 2027 preparation." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  // Assuming resetPassword is exported from your useAuth / lib/auth file
  const { signIn, signInWithGoogle, resetPassword } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const go = (uid: string) =>
    navigate({ to: isAdminUid(uid) ? "/admin" : "/dashboard" });

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const user = await signIn(email, password);
      toast.success("Welcome back!");
      await go(user.uid);
    } catch (err) {
      toast.error(friendlyAuthError(err));
    } finally {
      setBusy(false);
    }
  }

  async function onGoogle() {
    setBusy(true);
    try {
      const user = await signInWithGoogle();
      toast.success("Signed in with Google");
      await go(user.uid);
    } catch (err) {
      toast.error(friendlyAuthError(err));
    } finally {
      setBusy(false);
    }
  }

  // Handle sending the password reset email
  async function handleForgotPassword() {
    if (!email.trim()) {
      toast.error("Please enter your email address first.");
      return;
    }

    setBusy(true);
    try {
      await resetPassword(email);
      toast.success("Password reset email sent! Check your inbox.");
    } catch (err) {
      toast.error(friendlyAuthError(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthShell title="Welcome back" subtitle="Log in to continue your CET prep streak.">
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Password</Label>
            <button
              type="button"
              onClick={handleForgotPassword}
              disabled={busy}
              className="text-xs text-primary hover:underline focus:outline-none"
            >
              Forgot password?
            </button>
          </div>
          <Input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
        </div>
        <Button type="submit" variant="royal" className="w-full" disabled={busy}>
          {busy ? "Signing in…" : "Log in"}
        </Button>
      </form>

      <div className="my-6 flex items-center gap-3 text-xs text-muted-foreground">
        <span className="h-px flex-1 bg-border" /> or <span className="h-px flex-1 bg-border" />
      </div>

      <Button type="button" variant="soft" className="w-full" onClick={onGoogle} disabled={busy}>
        <GoogleIcon /> Continue with Google
      </Button>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        New here?{" "}
        <Link to="/register" className="font-semibold text-primary hover:underline">
          Create an account
        </Link>
      </p>
    </AuthShell>
  );
}