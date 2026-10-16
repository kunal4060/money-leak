"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { leaks, fmtPct, fmtMonth, metricLabel, type Leak } from "@/lib/data";
import SeverityBadge from "@/components/SeverityBadge";
import { IconSearch } from "@/components/icons";

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
      <div className="animate-rise">
        <div className="micro-label">Anomaly detection</div>
        <h1 className="mt-1.5 font-display text-3xl font-bold tracking-tight text-ink sm:text-4xl">
          Detect — anomaly flags
        </h1>
        <p className="tnum mt-2 text-sm text-ink2">
          25 strongest flags · z-score within category · cells with ≥8 transactions
        </p>
      </div>

      {/* Filters */}
      <div className="card flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="relative w-full lg:max-w-xs">
          <span
            aria-hidden
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-fog"
          >
            <IconSearch className="h-4 w-4" />
          </span>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search id, category, region, channel, period…"
            aria-label="Search flags"
            className="field pl-9"
          />
        </div>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Severity filter">
          {(["all", "high", "medium", "low"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setSevFilter(s)}
              aria-pressed={sevFilter === s}
              className={`rounded-full border px-3 py-1.5 text-xs font-semibold capitalize transition-colors duration-150 ${
                sevFilter === s
                  ? "border-accent bg-accent text-white"
                  : "border-line bg-paper text-ink2 hover:border-linedark hover:text-ink"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Metric filter">
          {(["all", "margin_pct", "return_rate"] as const).map((m) => (
            <button
              key={m}
              onClick={() => setMetricFilter(m)}
              aria-pressed={metricFilter === m}
              className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors duration-150 ${
                metricFilter === m
                  ? "border-ink bg-ink text-white"
                  : "border-line bg-paper text-ink2 hover:border-linedark hover:text-ink"
              }`}
            >
              {m === "all" ? "All metrics" : metricLabel[m]}
            </button>
          ))}
        </div>
        <div className="tnum ml-auto rounded-full bg-sagesoft px-2.5 py-1 font-mono text-[11px] font-medium text-ink2">
          {rows.length} of {leaks.length} flags
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden p-0">
        <div className="scroll-x overflow-x-auto">
          <table className="w-full min-w-[880px] text-left text-sm">
            <thead>
              <tr className="border-b border-line bg-page/60 font-mono text-[10px] uppercase tracking-[0.1em] text-fog">
                <th className="px-4 py-3 font-medium">
                  <button onClick={() => toggleSort("id")} className="transition-colors hover:text-ink">
                    ID{arrow("id")}
                  </button>
                </th>
                <th className="px-4 py-3 font-medium">Segment</th>
                <th className="px-4 py-3 font-medium">Metric</th>
                <th className="px-4 py-3 font-medium">Observed vs expected</th>
                <th className="px-4 py-3 font-medium">
                  <button onClick={() => toggleSort("zAbs")} className="transition-colors hover:text-ink">
                    |z|{arrow("zAbs")}
                  </button>
                </th>
                <th className="px-4 py-3 font-medium">
                  <button onClick={() => toggleSort("severity")} className="transition-colors hover:text-ink">
                    Severity{arrow("severity")}
                  </button>
                </th>
                <th className="px-4 py-3 font-medium">Period</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((l) => (
                <tr
                  key={l.id}
                  className="border-b border-line/70 transition-colors last:border-0 hover:bg-accent-soft/40"
                >
                  <td className="tnum px-4 py-3.5">
                    <Link
                      href={`/explain/${l.id}`}
                      className="font-mono text-[13px] font-semibold text-accent-deep hover:underline"
                    >
                      {l.id}
                    </Link>
                  </td>
                  <td className="px-4 py-3.5 text-ink2">
                    {l.segment.category} · {l.segment.region} · {l.segment.channel}
                  </td>
                  <td className="px-4 py-3.5 text-ink2">{metricLabel[l.metric]}</td>
                  <td className="tnum whitespace-nowrap px-4 py-3.5">
                    <span
                      className={
                        l.metric === "margin_pct" && l.observed < 0
                          ? "font-semibold text-brick-deep"
                          : "font-semibold text-ink"
                      }
                    >
                      {fmtPct(l.observed)}
                    </span>
                    <span className="text-fog"> vs </span>
                    <span className="text-ink2">{fmtPct(l.expected)}</span>
                  </td>
                  <td className="tnum px-4 py-3.5 font-mono text-[13px] font-medium text-ink">
                    {l.z.toFixed(2)}
                  </td>
                  <td className="px-4 py-3.5">
                    <SeverityBadge severity={l.severity} />
                  </td>
                  <td className="tnum px-4 py-3.5 text-ink2">{fmtMonth(l.period)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {rows.length === 0 && (
          <div className="px-4 py-12 text-center">
            <IconSearch className="mx-auto h-6 w-6 text-fog" />
            <div className="mt-2 text-sm font-semibold text-ink">No flags match</div>
            <div className="mt-1 text-sm text-ink2">
              Try clearing the search or choosing different filters.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
