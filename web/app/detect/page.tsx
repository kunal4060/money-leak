"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { leaks, fmtPct, fmtMonth, metricLabel, type Leak } from "@/lib/data";
import SeverityBadge from "@/components/SeverityBadge";

type SortKey = "zAbs" | "id" | "severity";

const severityRank: Record<Leak["severity"], number> = { high: 0, medium: 1, low: 2 };

export default function DetectPage() {
  const [sevFilter, setSevFilter] = useState<"all" | Leak["severity"]>("all");
  const [metricFilter, setMetricFilter] = useState<"all" | Leak["metric"]>("all");
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("zAbs");
  const [sortDir, setSortDir] = useState<1 | -1>(-1);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = leaks.filter((l) => {
      if (sevFilter !== "all" && l.severity !== sevFilter) return false;
      if (metricFilter !== "all" && l.metric !== metricFilter) return false;
      if (q) {
        const hay = [
          l.id,
          l.segment.category,
          l.segment.region,
          l.segment.channel,
          l.period,
          l.metric,
          l.severity,
        ]
          .join(" ")
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
    const key = (l: Leak): number =>
      sortKey === "zAbs" ? Math.abs(l.z) : sortKey === "severity" ? severityRank[l.severity] : 0;
    return [...filtered].sort((a, b) => {
      if (sortKey === "id") return (a.id < b.id ? -1 : 1) * sortDir;
      return (key(a) - key(b)) * sortDir;
    });
  }, [sevFilter, metricFilter, query, sortKey, sortDir]);

  const toggleSort = (k: SortKey) => {
    if (sortKey === k) setSortDir((d) => (d === 1 ? -1 : 1));
    else {
      setSortKey(k);
      setSortDir(-1);
    }
  };

  const arrow = (k: SortKey) =>
    sortKey === k ? (sortDir === -1 ? " ▼" : " ▲") : "";

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
          🔍 Detect — anomaly flags
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          25 strongest flags · z-score within category · cells with ≥8 transactions
        </p>
      </div>

      {/* Filters */}
      <div className="card flex flex-col gap-3 lg:flex-row lg:items-center">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search id, category, region, channel, period…"
          className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:bg-white lg:max-w-xs"
        />
        <div className="flex flex-wrap gap-2">
          {(["all", "high", "medium", "low"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setSevFilter(s)}
              className={`rounded-full border px-3 py-1.5 text-xs font-semibold capitalize transition-colors ${
                sevFilter === s
                  ? "border-emerald-600 bg-emerald-500 text-white"
                  : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          {(["all", "margin_pct", "return_rate"] as const).map((m) => (
            <button
              key={m}
              onClick={() => setMetricFilter(m)}
              className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
                metricFilter === m
                  ? "border-slate-800 bg-slate-900 text-white"
                  : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
              }`}
            >
              {m === "all" ? "All metrics" : metricLabel[m]}
            </button>
          ))}
        </div>
        <div className="tnum ml-auto text-xs text-slate-500">
          {rows.length} of {leaks.length} flags
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[880px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <th className="px-4 py-3 font-semibold">
                  <button onClick={() => toggleSort("id")} className="hover:text-slate-800">
                    ID{arrow("id")}
                  </button>
                </th>
                <th className="px-4 py-3 font-semibold">Segment</th>
                <th className="px-4 py-3 font-semibold">Metric</th>
                <th className="px-4 py-3 font-semibold">Observed vs expected</th>
                <th className="px-4 py-3 font-semibold">
                  <button onClick={() => toggleSort("zAbs")} className="hover:text-slate-800">
                    |z|{arrow("zAbs")}
                  </button>
                </th>
                <th className="px-4 py-3 font-semibold">
                  <button onClick={() => toggleSort("severity")} className="hover:text-slate-800">
                    Severity{arrow("severity")}
                  </button>
                </th>
                <th className="px-4 py-3 font-semibold">Period</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((l) => (
                <tr key={l.id} className="border-b border-slate-100 last:border-0 hover:bg-emerald-50/40">
                  <td className="tnum px-4 py-3 font-bold text-slate-900">
                    <Link href={`/explain/${l.id}`} className="text-emerald-700 hover:underline">
                      {l.id}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {l.segment.category} · {l.segment.region} · {l.segment.channel}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{metricLabel[l.metric]}</td>
                  <td className="tnum whitespace-nowrap px-4 py-3">
                    <span className={l.metric === "margin_pct" && l.observed < 0 ? "font-bold text-red-600" : "font-bold text-slate-900"}>
                      {fmtPct(l.observed)}
                    </span>
                    <span className="text-slate-400"> vs </span>
                    <span className="text-slate-500">{fmtPct(l.expected)}</span>
                  </td>
                  <td className="tnum px-4 py-3 font-semibold text-slate-800">{l.z.toFixed(2)}</td>
                  <td className="px-4 py-3">
                    <SeverityBadge severity={l.severity} />
                  </td>
                  <td className="tnum px-4 py-3 text-slate-600">{fmtMonth(l.period)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {rows.length === 0 && (
          <div className="px-4 py-10 text-center text-sm text-slate-500">
            No flags match the current filters.
          </div>
        )}
      </div>
    </div>
  );
}
