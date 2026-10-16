import Link from "next/link";
import {
  kpis,
  leaks,
  segments,
  buildTrend,
  fmtUSD,
  fmtPct,
  fmtNum,
  fmtMonth,
  metricLabel,
} from "@/lib/data";
import SeverityBadge from "@/components/SeverityBadge";
import TrendChart from "@/components/TrendChart";
import SegmentDonut from "@/components/SegmentDonut";

function KpiCard({
  kicker,
  value,
  sub,
  accent,
  delay = 0,
}: {
  kicker: string;
  value: string;
  sub?: string;
  accent?: boolean;
  delay?: number;
}) {
  return (
    <div className="card card-hover animate-fade-up" style={{ animationDelay: `${delay}ms` }}>
      <div className="kicker">{kicker}</div>
      <div
        className={`tnum mt-2 text-2xl font-extrabold tracking-tight sm:text-[26px] ${
          accent ? "text-emerald-600" : "text-slate-900"
        }`}
      >
        {value}
      </div>
      {sub && <div className="tnum mt-1 text-xs text-slate-500">{sub}</div>}
    </div>
  );
}

export default function OverviewPage() {
  const trend = buildTrend();
  const top5 = leaks.slice(0, 5);
  const highCount = leaks.filter((l) => l.severity === "high").length;

  return (
    <div className="space-y-6">
      {/* Hero */}
      <div className="animate-fade-up relative overflow-hidden rounded-3xl bg-slate-900 px-6 py-8 shadow-xl sm:px-8 sm:py-10">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-emerald-500/25 blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-28 -left-16 h-72 w-72 rounded-full bg-sky-500/15 blur-3xl"
        />
        <div className="relative">
          <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-emerald-300">
            Revenue intelligence · 2025
          </div>
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
            Where is the money leaking?
          </h1>
          <p className="tnum mt-2 max-w-2xl text-sm leading-relaxed text-slate-300">
            Jan 2025 → Dec 2025 · 18,000 transactions analysed ·{" "}
            <span className="font-bold text-red-300">{highCount} high-severity flags</span>{" "}
            detected across margin and return-rate anomalies
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/act"
              className="rounded-xl bg-emerald-500 px-5 py-2.5 text-sm font-bold text-white shadow-[0_0_24px_rgba(16,185,129,0.35)] transition-all hover:-translate-y-0.5 hover:bg-emerald-400"
            >
              🎯 View recommended actions
            </Link>
            <Link
              href="/detect"
              className="rounded-xl border border-slate-700 bg-slate-800/60 px-5 py-2.5 text-sm font-semibold text-slate-200 transition-all hover:-translate-y-0.5 hover:border-slate-600 hover:text-white"
            >
              Browse all 25 flags →
            </Link>
          </div>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 xl:grid-cols-6">
        <KpiCard
          kicker="Total revenue"
          value={fmtUSD(kpis.total_revenue)}
          sub="completed orders"
          delay={60}
        />
        <KpiCard
          kicker="Margin"
          value={fmtPct(kpis.margin_pct)}
          sub={fmtUSD(kpis.total_margin)}
          accent
          delay={120}
        />
        <KpiCard
          kicker="Cancel + return rate"
          value={fmtPct(kpis.cancel_return_rate)}
          sub={`${fmtNum(kpis.cancelled)} cancelled · ${fmtNum(kpis.returned)} returned`}
          delay={180}
        />
        <KpiCard
          kicker="Lost revenue"
          value={fmtUSD(kpis.lost_revenue)}
          sub="cancelled + returned"
          delay={240}
        />
        <KpiCard
          kicker="Stockout products"
          value={fmtNum(kpis.stockout_product_count)}
          sub="products at risk"
          delay={300}
        />
        <KpiCard kicker="Avg discount" value={fmtPct(kpis.avg_discount_pct)} sub="across all orders" delay={360} />
      </div>

      {/* Trend + donut */}
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="card animate-fade-up lg:col-span-2" style={{ animationDelay: "120ms" }}>
          <div className="mb-1 flex flex-wrap items-baseline justify-between gap-2">
            <div>
              <h2 className="text-base font-bold text-slate-900">Demand trend & forecast</h2>
              <p className="text-xs text-slate-500">
                Monthly completed quantity, all categories · forecast = 3-month moving average
              </p>
            </div>
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-500">
              12 months + 3 forecast
            </span>
          </div>
          <TrendChart data={trend} />
        </div>
        <div className="card animate-fade-up" style={{ animationDelay: "200ms" }}>
          <h2 className="text-base font-bold text-slate-900">Customer segments</h2>
          <p className="text-xs text-slate-500">KMeans on RFM + return rate</p>
          <div className="mt-2">
            <SegmentDonut segments={segments} />
          </div>
        </div>
      </div>

      {/* Top-5 leak preview */}
      <div className="animate-fade-up" style={{ animationDelay: "160ms" }}>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900">Top leak flags</h2>
          <Link
            href="/detect"
            className="rounded-lg px-2 py-1 text-sm font-semibold text-emerald-700 transition-colors hover:bg-emerald-50 hover:text-emerald-800"
          >
            View all 25 →
          </Link>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3 xl:grid-cols-5">
          {top5.map((l) => (
            <Link key={l.id} href={`/explain/${l.id}`} className="card card-hover block">
              <div className="flex items-center justify-between">
                <span className="tnum text-xs font-bold text-slate-500">{l.id}</span>
                <SeverityBadge severity={l.severity} />
              </div>
              <div className="mt-2 text-sm font-bold text-slate-900">{metricLabel[l.metric]}</div>
              <div className="text-xs text-slate-500">
                {l.segment.category} · {l.segment.region} · {l.segment.channel}
              </div>
              <div className="tnum mt-3 flex items-baseline gap-2">
                <span className="text-xl font-extrabold text-red-600">{fmtPct(l.observed)}</span>
                <span className="text-xs text-slate-400">vs {fmtPct(l.expected)} expected</span>
              </div>
              <div className="tnum mt-1 text-xs text-slate-500">
                z = {l.z.toFixed(2)} · {fmtMonth(l.period)}
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
