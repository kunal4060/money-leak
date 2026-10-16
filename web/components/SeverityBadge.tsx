"use client";

import type { Leak } from "@/lib/data";

const styles: Record<Leak["severity"], string> = {
  high: "border border-brick/25 bg-brick-soft text-brick-deep",
  medium: "border border-clay/25 bg-clay-soft text-clay",
  low: "border border-line bg-sagesoft text-ink2",
};

const dot: Record<Leak["severity"], string> = {
  high: "bg-brick",
  medium: "bg-clay",
  low: "bg-fog",
};

export default function SeverityBadge({ severity }: { severity: Leak["severity"] }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wider ${styles[severity]}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${dot[severity]}`} />
      {severity}
    </span>
  );
}
