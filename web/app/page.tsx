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
}: {
  kicker: string;
  value: string;
  sub?: string;
  accent?: boolean;
}) {
  return (
    <div className="card">
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
      {/* Page head */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
            Overview
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Jan 2025 → Dec 2025 · 18,000 transactions · {highCount} high-severity flags detected
          </p>
        </div>
        <Link
          href="/act"
          className="rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-emerald-600"
        >
          🎯 View recommended actions
        </Link>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
        <KpiCard kicker="Total revenue" value={fmtUSD(kpis.total_revenue)} sub="completed orders" />
        <KpiCard
          kicker="Margin"
          value={fmtPct(kpis.margin_pct)}
          sub={fmtUSD(kpis.total_margin)}
          accent
        />
        <KpiCard
          kicker="Cancel + return rate"
          value={fmtPct(kpis.cancel_return_rate)}
          sub={`${fmtNum(kpis.cancelled)} cancelled · ${fmtNum(kpis.returned)} returned`}
        />
        <KpiCard
          kicker="Lost revenue"
          value={fmtUSD(kpis.lost_revenue)}
          sub="cancelled + returned"
        />
        <KpiCard
          kicker="Stockout products"
          value={fmtNum(kpis.stockout_product_count)}
          sub="products at risk"
        />
        <KpiCard
          kicker="Avg discount"
          value={fmtPct(kpis.avg_discount_pct)}
          sub="across all orders"
        />
      </div>

      {/* Trend + donut */}
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="card lg:col-span-2">
          <div className="mb-1 flex items-baseline justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900">Demand trend & forecast</h2>
              <p className="text-xs text-slate-500">
                Monthly completed quantity, all categories · forecast = 3-month moving average
              </p>
            </div>
          </div>
          <TrendChart data={trend} />
        </div>
        <div className="card">
          <h2 className="text-base font-bold text-slate-900">Customer segments</h2>
          <p className="text-xs text-slate-500">KMeans on RFM + return rate</p>
          <SegmentDonut segments={segments} />
        </div>
      </div>

      {/* Top-5 leak preview */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900">Top leak flags</h2>
          <Link href="/detect" className="text-sm font-semibold text-emerald-600 hover:text-emerald-700">
            View all 25 →
          </Link>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
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
                <span className="text-xl font-extrabold text-red-600">
                  {fmtPct(l.observed)}
                </span>
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
