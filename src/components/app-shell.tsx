"use client";

import {
  Bell,
  Building2,
  ChartColumn,
  ChevronDown,
  FileText,
  FlaskConical,
  LayoutDashboard,
  LogOut,
  Menu,
  ScrollText,
  Settings,
  ShieldCheck,
  Users,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { cx } from "@/lib/format";
import { siteLevel } from "@/lib/risk-engine";
import { useStore } from "@/lib/store";
import { WorkflowProvider } from "./workflow";
import { RiskBadge } from "./ui";

export const SESSION_KEY = "sitesafe-session";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/teams", label: "Teams", icon: Users },
  { href: "/sites", label: "Sites", icon: Building2 },
  { href: "/safety-log", label: "Safety Log", icon: ScrollText },
  { href: "/analytics", label: "Analytics", icon: ChartColumn },
  { href: "/report", label: "Daily Report", icon: FileText },
  { href: "/demo", label: "Risk Simulator", icon: FlaskConical },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Logo({ className, descriptor }: { className?: string; descriptor?: boolean }) {
  return (
    <div className={cx("flex items-center gap-2.5", className)}>
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] bg-gradient-to-br from-[#2b2b2e] to-[#0b0b0c] shadow-sm">
        <ShieldCheck className="h-[18px] w-[18px] text-white" strokeWidth={2.4} />
      </div>
      <span className="leading-tight">
        <span className="block text-[17px] font-semibold tracking-tight">
          SiteSafe <span className="text-ink-3">SI</span>
        </span>
        {descriptor && <span className="block text-[11px] text-ink-3">Site Safety Super Intelligence</span>}
      </span>
    </div>
  );
}

function SiteSelector() {
  const { state, setSite } = useStore();
  const [open, setOpen] = useState(false);
  if (!state) return null;
  const site = state.sites.find((s) => s.id === state.currentSiteId)!;
  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between rounded-xl border border-line bg-white px-3 py-2 text-left hover:border-ink-3"
      >
        <span>
          <span className="block text-[11px] text-ink-3">Current site</span>
          <span className="block text-sm font-medium">{site.name}</span>
        </span>
        <ChevronDown className="h-4 w-4 text-ink-3" />
      </button>
      {open && (
        <div className="animate-pop absolute z-30 mt-1 w-full rounded-xl border border-line bg-white p-1 shadow-[var(--shadow-pop)]">
          {state.sites.map((s) => (
            <button
              key={s.id}
              onClick={() => {
                setSite(s.id);
                setOpen(false);
              }}
              className={cx("flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left text-sm hover:bg-line-2", s.id === site.id && "bg-line-2")}
            >
              {s.name}
              <RiskBadge level={siteLevel(s.temperature, s.humidity)} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const { state } = useStore();
  const activeAlerts = state?.alerts.filter((a) => a.status === "active").length ?? 0;
  return (
    <div className="flex h-full flex-col gap-5 p-4">
      <Logo className="px-1 pt-1" descriptor />
      <SiteSelector />
      <nav className="flex flex-col gap-0.5">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || (href !== "/dashboard" && pathname.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              onClick={onNavigate}
              className={cx(
                "flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-colors",
                active ? "bg-white text-ink shadow-[var(--shadow-card)]" : "text-ink-2 hover:bg-white/60 hover:text-ink",
              )}
            >
              <Icon className="h-[18px] w-[18px]" strokeWidth={active ? 2.2 : 1.8} />
              <span className="flex-1">{label}</span>
              {href === "/dashboard" && activeAlerts > 0 && (
                <span className="rounded-full bg-critical px-1.5 py-0.5 text-[10px] leading-none font-semibold text-white">{activeAlerts}</span>
              )}
              {href === "/demo" && <span className="rounded-md bg-chart/10 px-1.5 py-0.5 text-[10px] font-semibold text-chart">LIVE</span>}
            </Link>
          );
        })}
      </nav>
      <div className="mt-auto rounded-2xl border border-line bg-white p-3">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-ink text-xs font-semibold text-white">
            {(state?.supervisor ?? "Alex Morgan")
              .split(" ")
              .map((p) => p[0])
              .join("")
              .slice(0, 2)}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{state?.supervisor ?? "Alex Morgan"}</p>
            <p className="truncate text-xs text-ink-3">Site Safety Manager</p>
          </div>
          <button
            aria-label="Sign out"
            title="Sign out"
            onClick={() => {
              try {
                localStorage.removeItem(SESSION_KEY);
              } catch {}
              router.push("/");
            }}
            className="rounded-lg p-1.5 text-ink-3 hover:bg-line-2 hover:text-ink"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

function Clock() {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const t = setInterval(() => setNow(new Date()), 15_000);
    return () => clearInterval(t);
  }, []);
  if (!now) return null;
  return (
    <span className="tabular text-sm text-ink-2">
      {now.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })} ·{" "}
      {now.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
    </span>
  );
}

function LoadingDashboard() {
  return (
    <div className="space-y-5">
      <div className="skeleton h-9 w-64" />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="skeleton h-24" />
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="skeleton h-72 lg:col-span-2" />
        <div className="skeleton h-72" />
      </div>
      <p className="text-center text-sm text-ink-3">Loading site data…</p>
    </div>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const { state } = useStore();
  const router = useRouter();
  const [drawer, setDrawer] = useState(false);
  const [authed, setAuthed] = useState<boolean | null>(null);

  useEffect(() => {
    let ok = false;
    try {
      ok = localStorage.getItem(SESSION_KEY) === "1";
    } catch {
      ok = true; // storage blocked — don't lock the demo out
    }
    setAuthed(ok);
    if (!ok) router.replace("/");
  }, [router]);

  const activeAlerts = state?.alerts.filter((a) => a.status === "active").length ?? 0;
  const site = state?.sites.find((s) => s.id === state.currentSiteId);

  return (
    <WorkflowProvider>
      <div className="min-h-screen lg:pl-64">
        <aside className="no-print fixed inset-y-0 left-0 hidden w-64 border-r border-line bg-[#efeeea] lg:block">
          <Sidebar />
        </aside>

        {drawer && (
          <div className="fixed inset-0 z-40 lg:hidden">
            <div className="absolute inset-0 bg-black/25" onClick={() => setDrawer(false)} />
            <div className="animate-fade-up absolute inset-y-0 left-0 w-72 bg-[#efeeea] shadow-xl">
              <button onClick={() => setDrawer(false)} aria-label="Close menu" className="absolute top-4 right-3 rounded-lg p-1.5 text-ink-2">
                <X className="h-5 w-5" />
              </button>
              <Sidebar onNavigate={() => setDrawer(false)} />
            </div>
          </div>
        )}

        <header className="no-print sticky top-0 z-20 border-b border-line bg-bg/85 backdrop-blur-md">
          <div className="mx-auto flex h-14 max-w-7xl items-center gap-3 px-4 sm:px-6 lg:px-8">
            <button onClick={() => setDrawer(true)} aria-label="Open menu" className="-ml-1 rounded-lg p-1.5 lg:hidden">
              <Menu className="h-5 w-5" />
            </button>
            <Logo className="lg:hidden" />
            <div className="hidden min-w-0 items-center gap-2 text-sm lg:flex">
              <span className="font-medium">{site?.location.split(" · ")[0] ?? "—"}</span>
              {site && (
                <span className="flex items-center gap-1.5 rounded-full bg-white px-2.5 py-0.5 text-xs text-ink-2 ring-1 ring-line">
                  Site conditions: <span className="font-medium text-ink">{site.status}</span>
                </span>
              )}
            </div>
            <div className="ml-auto flex items-center gap-4">
              <span className="hidden sm:inline">
                <Clock />
              </span>
              <Link href="/dashboard#alerts" className="relative rounded-full p-2 hover:bg-white" aria-label={`${activeAlerts} active alerts`}>
                <Bell className="h-[18px] w-[18px]" />
                {activeAlerts > 0 && <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-critical ring-2 ring-bg" />}
              </Link>
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">{state && authed ? children : <LoadingDashboard />}</main>

        <footer className="mx-auto max-w-7xl px-4 pb-10 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-2 border-t border-line pt-5 text-xs text-ink-3 sm:flex-row sm:items-center sm:justify-between">
            <p>Safety decisions remain subject to qualified occupational-health procedures and applicable regulations.</p>
            <p>Prototype · demo data · not a health-monitoring or medical device</p>
          </div>
        </footer>
      </div>
    </WorkflowProvider>
  );
}
