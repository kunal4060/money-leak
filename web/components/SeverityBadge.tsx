"use client";

import type { Leak } from "@/lib/data";

const styles: Record<Leak["severity"], string> = {
  high: "bg-red-50 text-red-700 border-red-200",
  medium: "bg-amber-50 text-amber-700 border-amber-200",
  low: "bg-slate-100 text-slate-600 border-slate-200",
};

const dot: Record<Leak["severity"], string> = {
  high: "bg-red-500",
  medium: "bg-amber-500",
  low: "bg-slate-400",
};

export default function SeverityBadge({ severity }: { severity: Leak["severity"] }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${styles[severity]}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${dot[severity]}`} />
      {severity}
    </span>
  );
}
