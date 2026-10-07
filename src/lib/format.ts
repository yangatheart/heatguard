import type { RiskLevel } from "./types";

export function relativeTime(iso: string, now = Date.now()): string {
  const diff = Math.max(0, Math.round((now - new Date(iso).getTime()) / 60_000));
  if (diff < 1) return "Just now";
  if (diff < 60) return `${diff} min ago`;
  const h = Math.floor(diff / 60);
  if (h < 24) return `${h} h ago`;
  return `${Math.floor(h / 24)} d ago`;
}

export function hhmm(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

export function dayLabel(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  const y = new Date();
  y.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return "Today";
  if (d.toDateString() === y.toDateString()) return "Yesterday";
  return d.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "short" });
}

export const LEVEL_STYLE: Record<RiskLevel, { label: string; fg: string; bg: string; dot: string; hex: string }> = {
  LOW: { label: "Low", fg: "text-low", bg: "bg-low-bg", dot: "bg-low", hex: "#2f9e5b" },
  MODERATE: { label: "Moderate", fg: "text-moderate", bg: "bg-moderate-bg", dot: "bg-moderate", hex: "#c98a00" },
  HIGH: { label: "High", fg: "text-high", bg: "bg-high-bg", dot: "bg-high", hex: "#e8691b" },
  CRITICAL: { label: "Critical", fg: "text-critical", bg: "bg-critical-bg", dot: "bg-critical", hex: "#e0383e" },
};

export const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");
