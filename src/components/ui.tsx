"use client";

import { X, type LucideIcon } from "lucide-react";
import { useEffect, type ReactNode } from "react";
import { LEVEL_STYLE, cx } from "@/lib/format";
import type { RiskLevel } from "@/lib/types";

export function Card({ className, children, ...rest }: { className?: string; children: ReactNode } & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cx("rounded-2xl border border-line bg-card shadow-[var(--shadow-card)]", className)} {...rest}>
      {children}
    </div>
  );
}

export function RiskBadge({ level, size = "sm" }: { level: RiskLevel; size?: "sm" | "md" }) {
  const s = LEVEL_STYLE[level];
  return (
    <span
      className={cx(
        "inline-flex items-center gap-1.5 rounded-full font-medium whitespace-nowrap",
        s.bg,
        s.fg,
        size === "sm" ? "px-2 py-0.5 text-xs" : "px-3 py-1 text-sm",
      )}
    >
      <span className={cx("h-1.5 w-1.5 rounded-full", s.dot)} />
      {s.label}
    </span>
  );
}

type BtnVariant = "primary" | "secondary" | "ghost" | "danger";
export function Button({
  variant = "primary",
  icon: Icon,
  className,
  children,
  ...rest
}: { variant?: BtnVariant; icon?: LucideIcon } & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const v: Record<BtnVariant, string> = {
    primary: "bg-ink text-white hover:bg-black disabled:bg-ink-3",
    secondary: "bg-white text-ink border border-line hover:bg-line-2",
    ghost: "text-ink-2 hover:text-ink hover:bg-line-2",
    danger: "bg-critical text-white hover:brightness-95",
  };
  return (
    <button
      className={cx(
        "inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium whitespace-nowrap transition-all active:scale-[0.98] disabled:cursor-not-allowed",
        v[variant],
        className,
      )}
      {...rest}
    >
      {Icon && <Icon className="h-4 w-4" strokeWidth={2} />}
      {children}
    </button>
  );
}

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-[28px] font-semibold tracking-tight text-ink">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-ink-2">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function SimulatedTag({ children = "Prototype · demo data" }: { children?: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-dashed border-line bg-white px-2.5 py-0.5 text-[11px] font-medium text-ink-2">
      <span className="h-1.5 w-1.5 rounded-full bg-chart" />
      {children}
    </span>
  );
}

export function Banner({ tone = "info", icon: Icon, children }: { tone?: "info" | "warn" | "error"; icon?: LucideIcon; children: ReactNode }) {
  const t = {
    info: "bg-white border-line text-ink-2",
    warn: "bg-moderate-bg border-moderate/20 text-[#7a5500]",
    error: "bg-critical-bg border-critical/20 text-[#8a1f23]",
  }[tone];
  return (
    <div className={cx("flex items-start gap-2.5 rounded-xl border px-3.5 py-2.5 text-sm", t)}>
      {Icon && <Icon className="mt-0.5 h-4 w-4 shrink-0" />}
      <div>{children}</div>
    </div>
  );
}

export function EmptyState({ icon: Icon, title, body, action }: { icon: LucideIcon; title: string; body?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-line-2">
        <Icon className="h-5 w-5 text-ink-2" />
      </div>
      <p className="font-medium text-ink">{title}</p>
      {body && <p className="mt-1 max-w-sm text-sm text-ink-2">{body}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function Modal({ open, onClose, children, wide }: { open: boolean; onClose: () => void; children: ReactNode; wide?: boolean }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-6">
      <div className="absolute inset-0 bg-black/25 backdrop-blur-[2px]" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        className={cx(
          "animate-pop relative max-h-[92vh] w-full overflow-y-auto rounded-t-3xl bg-white shadow-[var(--shadow-pop)] sm:rounded-3xl",
          wide ? "sm:max-w-2xl" : "sm:max-w-lg",
        )}
      >
        <button onClick={onClose} aria-label="Close" className="absolute top-4 right-4 rounded-full p-1.5 text-ink-3 hover:bg-line-2 hover:text-ink">
          <X className="h-4 w-4" />
        </button>
        {children}
      </div>
    </div>
  );
}

/** Circular score gauge. */
export function ScoreRing({ score, level, size = 168, stroke = 12 }: { score: number; level: RiskLevel; size?: number; stroke?: number }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const hex = LEVEL_STYLE[level].hex;
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--line-2)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={hex}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - score / 100)}
          style={{ transition: "stroke-dashoffset 0.9s cubic-bezier(.2,.8,.2,1), stroke 0.4s" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="tabular text-5xl font-semibold tracking-tight text-ink">{score}</span>
        <span className="text-xs text-ink-3">/ 100</span>
      </div>
    </div>
  );
}

/** Horizontal segmented scale showing where a value sits across the four bands. */
export function RiskScale({ score, thresholds }: { score: number; thresholds: { moderate: number; high: number; critical: number } }) {
  const segs: [RiskLevel, number, number][] = [
    ["LOW", 0, thresholds.moderate],
    ["MODERATE", thresholds.moderate, thresholds.high],
    ["HIGH", thresholds.high, thresholds.critical],
    ["CRITICAL", thresholds.critical, 100],
  ];
  return (
    <div>
      <div className="relative flex h-2 gap-[2px]">
        {segs.map(([l, a, b]) => (
          <div key={l} className={cx("h-full rounded-full", LEVEL_STYLE[l].dot)} style={{ width: `${b - a}%`, opacity: 0.85 }} />
        ))}
        <div
          className="absolute -top-1 h-4 w-4 -translate-x-1/2 rounded-full border-[3px] border-white bg-ink shadow"
          style={{ left: `${Math.min(99, Math.max(1, score))}%`, transition: "left 0.9s cubic-bezier(.2,.8,.2,1)" }}
        />
      </div>
      <div className="mt-2 flex text-[11px] text-ink-3">
        {segs.map(([l, a, b]) => (
          <span key={l} style={{ width: `${b - a}%` }}>
            {LEVEL_STYLE[l].label}
          </span>
        ))}
      </div>
    </div>
  );
}

export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={cx("relative h-6 w-10 shrink-0 rounded-full transition-colors", checked ? "bg-low" : "bg-line")}
    >
      <span className={cx("absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all", checked ? "left-[18px]" : "left-0.5")} />
    </button>
  );
}

export function Segmented<T extends string>({ value, options, onChange }: { value: T; options: T[]; onChange: (v: T) => void }) {
  return (
    <div className="inline-flex w-full rounded-xl bg-line-2 p-1">
      {options.map((o) => (
        <button
          key={o}
          onClick={() => onChange(o)}
          className={cx(
            "flex-1 rounded-lg px-3 py-1.5 text-sm font-medium transition-all",
            value === o ? "bg-white text-ink shadow-sm" : "text-ink-2 hover:text-ink",
          )}
        >
          {o}
        </button>
      ))}
    </div>
  );
}

/** Where a value comes from: sensor, calculation, supervisor input, tracking or configuration. */
export function SourceTag({ source, className }: { source: string; className?: string }) {
  return <span className={cx("text-[11px] leading-tight text-ink-3", className)}>{source}</span>;
}

export function Avatar({ name, size = 32 }: { name: string; size?: number }) {
  const initials = name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2);
  const hue = [...name].reduce((h, c) => h + c.charCodeAt(0), 0) % 360;
  return (
    <span
      className="flex shrink-0 items-center justify-center rounded-full text-[11px] font-semibold"
      style={{ width: size, height: size, background: `hsl(${hue} 30% 92%)`, color: `hsl(${hue} 25% 32%)`, fontSize: size * 0.34 }}
    >
      {initials}
    </span>
  );
}
