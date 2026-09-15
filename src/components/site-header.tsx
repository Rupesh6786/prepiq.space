import { Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import {
  Menu,
  Crown,
  LogOut,
  LayoutDashboard,
  Home,
  BookOpen,
  ListChecks,
  Info,
  User,
  Mail,
  Sun,
  Moon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useAuth } from "@/lib/auth";
import { useTheme } from "@/lib/theme";

const NAV = [
  { to: "/", label: "Home", short: "Home", icon: Home },
  { to: "/syllabus", label: "Syllabus", short: "Syllabus", icon: BookOpen },
  { to: "/practice", label: "Practice & tests", short: "Practice", icon: ListChecks },
  { to: "/exam-info", label: "Exam info", short: "Exam", icon: Info },
  { to: "/contact", label: "Contact us", short: "Contact", icon: Mail },
] as const;

export function ThemeToggle() {
  const { theme, toggle } = useTheme();
  return (
    <button
      onClick={toggle}
      aria-label="Toggle dark mode"
      className="grid size-10 place-items-center rounded-xl border border-border text-muted-foreground transition hover:text-foreground"
    >
      {theme === "dark" ? <Sun className="size-4.5" /> : <Moon className="size-4.5" />}
    </button>
  );
}

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const { user, isAdmin, signOut } = useAuth();
  const navigate = useNavigate();

  async function handleSignOut() {
    await signOut();
    setOpen(false);
    navigate({ to: "/", replace: true });
  }

  return (
    <header className="sticky top-0 z-50 border-b border-border/70 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between gap-3 px-4 sm:px-6">
        {/* Mobile: hamburger (left sidebar) — only on small screens */}
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <button
              aria-label="Open navigation"
              className="grid size-10 shrink-0 place-items-center rounded-xl border border-border text-muted-foreground transition hover:text-foreground lg:hidden"
            >
              <Menu className="size-5" />
            </button>
          </SheetTrigger>
          <SheetContent side="left" className="w-[85vw] max-w-xs p-0">
            <SheetHeader className="border-b px-5 py-4">
              <SheetTitle className="flex items-center gap-2.5">
                <span className="grid size-8 place-items-center rounded-lg bg-[image:var(--gradient-royal)] text-primary-foreground">
                  <Crown className="size-4" />
                </span>
                <span className="font-display text-base font-bold">PrepIQ.space</span>
              </SheetTitle>
            </SheetHeader>
            <nav className="flex flex-col gap-1 p-4">
              {NAV.map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  onClick={() => setOpen(false)}
                  activeProps={{ className: "bg-royal-soft text-royal" }}
                  className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted"
                >
                  <item.icon className="size-4" /> {item.label}
                </Link>
              ))}
              {user && (
                <>
                  <Link
                    to="/profile"
                    onClick={() => setOpen(false)}
                    activeProps={{ className: "bg-royal-soft text-royal" }}
                    className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted"
                  >
                    <User className="size-4" /> My profile
                  </Link>
                  <Link
                    to={isAdmin ? "/admin" : "/dashboard"}
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted"
                  >
                    <LayoutDashboard className="size-4" /> {isAdmin ? "Admin panel" : "Dashboard"}
                  </Link>
                </>
              )}
              <div className="mt-4 flex flex-col gap-2 border-t pt-4">
                {user ? (
                  <Button variant="outline" onClick={handleSignOut}>
                    <LogOut className="size-4" /> Sign out
                  </Button>
                ) : (
                  <>
                    <Button asChild variant="outline" onClick={() => setOpen(false)}>
                      <Link to="/login">Log in</Link>
                    </Button>
                    <Button asChild variant="royal" onClick={() => setOpen(false)}>
                      <Link to="/register">Create account</Link>
                    </Button>
                  </>
                )}
              </div>
            </nav>
          </SheetContent>
        </Sheet>

        {/* Logo — always visible */}
        <Link to="/" className="flex shrink-0 items-center gap-2.5">
          <span className="grid size-9 place-items-center rounded-xl bg-[image:var(--gradient-royal)] text-primary-foreground shadow-[var(--shadow-royal)]">
            <Crown className="size-4.5" />
          </span>
          <span className="font-display text-lg font-bold tracking-tight">
            Prep<span className="text-gradient-royal">IQ</span>.space
          </span>
        </Link>

        {/* Desktop: inline top nav — large screens only */}
        <nav className="hidden min-w-0 items-center gap-0.5 lg:flex">
          {NAV.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              activeProps={{ className: "bg-royal-soft text-royal" }}
              className="flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-2 text-sm font-medium whitespace-nowrap text-muted-foreground transition hover:bg-muted hover:text-foreground xl:px-3"
            >
              <item.icon className="size-4 shrink-0" />
              <span className="hidden xl:inline">{item.label}</span>
              <span className="xl:hidden">{item.short}</span>
            </Link>
          ))}
        </nav>

        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
          <ThemeToggle />
          {user ? (
            <>
              <Button asChild variant="soft" size="sm" className="hidden sm:inline-flex">
                <Link to={isAdmin ? "/admin" : "/dashboard"}>
                  <LayoutDashboard /> {isAdmin ? "Admin" : "Dashboard"}
                </Link>
              </Button>
              <Button asChild variant="ghost" size="sm">
                <Link to="/profile">
                  <User /> <span className="hidden sm:inline">Profile</span>
                </Link>
              </Button>
              <Button variant="outline" size="sm" onClick={handleSignOut}>
                <LogOut /> <span className="hidden sm:inline">Sign out</span>
              </Button>
            </>
          ) : (
            <>
              <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
                <Link to="/login">Log in</Link>
              </Button>
              <Button asChild variant="royal" size="sm">
                <Link to="/register">Start free</Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-card">
      <div className="mx-auto grid w-full max-w-7xl gap-8 px-4 py-12 sm:px-6 md:grid-cols-4">
        <div className="md:col-span-2">
          <div className="flex items-center gap-2.5">
            <span className="grid size-9 place-items-center rounded-xl bg-[image:var(--gradient-royal)] text-primary-foreground">
              <Crown className="size-4.5" />
            </span>
            <span className="font-display text-lg font-bold">PrepIQ.space</span>
          </div>
          <p className="mt-3 max-w-sm text-sm text-muted-foreground">
            A focused preparation platform for the MAH MCA CET 2027 — 83 syllabus topics, AI-built
            question banks and analytics that actually tell you what to fix.
          </p>
        </div>
        <div>
          <h4 className="text-sm font-semibold">Platform</h4>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            <li>
              <Link to="/practice" className="hover:text-foreground">
                Practice & mocks
              </Link>
            </li>
            <li>
              <Link to="/syllabus" className="hover:text-foreground">
                Syllabus tracker
              </Link>
            </li>
            <li>
              <Link to="/dashboard" className="hover:text-foreground">
                My analytics
              </Link>
            </li>
            <li>
              <Link to="/profile" className="hover:text-foreground">
                My profile
              </Link>
            </li>
          </ul>
        </div>
        <div>
          <h4 className="text-sm font-semibold">Exam</h4>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            <li>
              <Link to="/exam-info" className="hover:text-foreground">
                Dates & cut-offs
              </Link>
            </li>
            <li>
              <Link to="/contact" className="hover:text-foreground">
                Contact us
              </Link>
            </li>
            <li>
              <Link to="/login" className="hover:text-foreground">
                Log in
              </Link>
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-border py-5 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} PrepIQ.space. Built for MAH MCA CET 2027 aspirants.
      </div>
    </footer>
  );
}
