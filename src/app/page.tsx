"use client";

import { ArrowRight, Bell, ClipboardCheck, Lock, ScrollText, Thermometer } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Logo, SESSION_KEY } from "@/components/app-shell";
import { Button, SimulatedTag } from "@/components/ui";

const FLOW = [
  { icon: Thermometer, label: "Heat-risk signal" },
  { icon: Bell, label: "Actionable alert" },
  { icon: ClipboardCheck, label: "Supervisor confirms" },
  { icon: ScrollText, label: "Auditable record" },
];

export default function Login() {
  const router = useRouter();
  const [entering, setEntering] = useState(false);
  const enter = () => {
    setEntering(true);
    try {
      localStorage.setItem(SESSION_KEY, "1");
    } catch {}
    router.push("/dashboard");
  };

  return (
    <div className="flex min-h-screen flex-col">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-6">
        <Logo />
        <SimulatedTag>Investor & customer demo</SimulatedTag>
      </header>

      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col items-center justify-center px-6 pb-16 text-center">
        <h1 className="animate-fade-up max-w-3xl text-4xl leading-[1.08] font-semibold tracking-tight text-ink sm:text-6xl">
          Protect workers before heat becomes an incident.
        </h1>
        <p className="animate-fade-up mt-5 max-w-xl text-lg text-ink-2" style={{ animationDelay: "80ms" }}>
          HeatGuard turns real-time heat-risk signals into actionable safety interventions and auditable site records.
        </p>

        <div className="animate-fade-up mt-9 w-full max-w-sm rounded-3xl border border-line bg-white p-6 text-left shadow-[var(--shadow-pop)]" style={{ animationDelay: "160ms" }}>
          <p className="text-sm font-medium">Sign in to your workspace</p>
          <div className="mt-3 space-y-2">
            <div className="rounded-xl border border-line bg-line-2/60 px-3 py-2.5 text-sm text-ink-2">alex.morgan@iberiabuild.demo</div>
            <div className="flex items-center gap-2 rounded-xl border border-line bg-line-2/60 px-3 py-2.5 text-sm text-ink-3">
              <Lock className="h-3.5 w-3.5" /> Demo access — no password required
            </div>
          </div>
          <Button onClick={enter} disabled={entering} className="mt-4 w-full py-3" icon={entering ? undefined : ArrowRight}>
            {entering ? "Opening dashboard…" : "Enter Demo"}
          </Button>
        </div>

        <div className="animate-fade-up mt-12 flex flex-wrap items-center justify-center gap-2 text-sm text-ink-2" style={{ animationDelay: "240ms" }}>
          {FLOW.map(({ icon: Icon, label }, i) => (
            <div key={label} className="flex items-center gap-2">
              <span className="flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 ring-1 ring-line">
                <Icon className="h-3.5 w-3.5" />
                {label}
              </span>
              {i < FLOW.length - 1 && <span className="text-ink-3">→</span>}
            </div>
          ))}
        </div>
      </main>

      <footer className="mx-auto w-full max-w-6xl px-6 pb-8 text-center text-xs text-ink-3">
        Prototype using simulated worker and wearable data. Designed for safety management, not productivity surveillance.
      </footer>
    </div>
  );
}
