"use client";

import { useEffect, useState } from "react";
import { fmtPct } from "@/lib/data";

/**
 * Diverging scale visual: zero in the middle, negative to the left,
 * positive to the right. Observed (brick) vs expected (fog) bars.
 * Bars animate in on mount.
 */
export default function ObservedVsExpected({
  observed,
  expected,
  z,
}: {
  observed: number;
  expected: number;
  z: number;
}) {
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const t = requestAnimationFrame(() => setShown(true));
    return () => cancelAnimationFrame(t);
  }, []);

  const half = Math.max(Math.abs(observed), Math.abs(expected), 1) * 1.12;
  const w = (v: number) => `${(Math.abs(v) / half) * 50}%`;

  const row = (label: string, value: number, color: string) => (
    <div className="flex items-center gap-3">
      <div className="w-24 shrink-0 text-right text-xs font-medium text-ink2">{label}</div>
      <div className="relative h-9 flex-1 rounded-lg bg-sagesoft">
        {/* zero line */}
        <div className="absolute left-1/2 top-0 h-full w-px bg-fog" />
        {/* gridline marks at quarter points */}
        <div className="absolute left-1/4 top-0 h-full w-px bg-line/70" />
        <div className="absolute left-3/4 top-0 h-full w-px bg-line/70" />
        {value < 0 ? (
          <div
            className={`absolute right-1/2 top-1/2 h-6 -translate-y-1/2 rounded-l-md ${color} transition-all duration-700 ease-out`}
            style={{ width: shown ? w(value) : "0%" }}
          />
        ) : (
          <div
            className={`absolute left-1/2 top-1/2 h-6 -translate-y-1/2 rounded-r-md ${color} transition-all duration-700 ease-out`}
            style={{ width: shown ? w(value) : "0%" }}
          />
        )}
      </div>
      <div className="tnum w-24 shrink-0 text-sm font-semibold text-ink">{fmtPct(value)}</div>
    </div>
  );

  return (
    <div>
      <div className="space-y-3">
        {row("Observed", observed, "bg-brick")}
        {row("Expected", expected, "bg-fog")}
      </div>
      <div className="tnum mt-2 flex justify-between font-mono text-[10px] text-fog">
        <span>{fmtPct(-half)}</span>
        <span className="font-medium text-ink2">0</span>
        <span>{fmtPct(half)}</span>
      </div>
      <div
        className={`tnum mt-4 inline-flex items-center gap-2.5 rounded-xl border border-line bg-paper px-4 py-2.5 transition-all duration-500 ${
          shown ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"
        }`}
      >
        <span className="font-mono text-[10px] font-medium uppercase tracking-wider text-fog">
          z-score
        </span>
        <span className="font-display text-xl font-bold text-ink">{z.toFixed(2)}</span>
        <span className="text-xs text-ink2">
          ({Math.abs(z).toFixed(1)}σ away from the {z < 0 ? "low" : "high"} tail)
        </span>
      </div>
    </div>
  );
}
