"use client";

import { useEffect, useState } from "react";
import { fmtPct } from "@/lib/data";

/**
 * Diverging scale visual: zero in the middle, negative to the left,
 * positive to the right. Observed (red) vs expected (slate) bars.
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
      <div className="w-24 shrink-0 text-right text-xs font-semibold text-slate-500">{label}</div>
      <div className="relative h-9 flex-1 rounded-lg bg-slate-50">
        {/* zero line */}
        <div className="absolute left-1/2 top-0 h-full w-px bg-slate-400" />
        {/* gridline marks at quarter points */}
        <div className="absolute left-1/4 top-0 h-full w-px bg-slate-200/70" />
        <div className="absolute left-3/4 top-0 h-full w-px bg-slate-200/70" />
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
      <div className="tnum w-24 shrink-0 text-sm font-bold text-slate-900">{fmtPct(value)}</div>
    </div>
  );

  return (
    <div>
      <div className="space-y-3">
        {row("Observed", observed, "bg-gradient-to-r from-red-600 to-red-400")}
        {row("Expected", expected, "bg-slate-400")}
      </div>
      <div className="tnum mt-2 flex justify-between text-[11px] text-slate-400">
        <span>{fmtPct(-half)}</span>
        <span className="font-semibold text-slate-500">0</span>
        <span>{fmtPct(half)}</span>
      </div>
      <div
        className={`tnum mt-4 inline-flex items-center gap-2.5 rounded-2xl bg-slate-900 px-4 py-2.5 text-white shadow-lg transition-all duration-500 ${
          shown ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"
        }`}
      >
        <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
          z-score
        </span>
        <span className="text-xl font-extrabold">{z.toFixed(2)}</span>
        <span className="text-xs text-slate-400">
          ({Math.abs(z).toFixed(1)}σ away from the {z < 0 ? "low" : "high"} tail)
        </span>
      </div>
    </div>
  );
}
