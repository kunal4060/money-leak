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
import { IconArrowRight } from "@/components/icons";

function KpiCard({
  kicker,
  value,
  sub,
  tone,
}: {
  kicker: string;
  value: string;
  sub?: string;
  tone?: "brick" | "accent";
}) {
  const valueColor =
    tone === "brick" ? "text-brick-deep" : tone === "accent" ? "text-accent-deep" : "text-ink";
  return (
    <div className="card">
      <div className="kicker">{kicker}</div>
      <div className={`tnum mt-2.5 font-display text-[22px] font-bold tracking-tight sm:text-[26px] ${valueColor}`}>
        {value}
      </div>
      {sub && <div className="tnum mt-1.5 text-xs text-fog">{sub}</div>}
    </div>
  );
}

export default function OverviewPage() {
  const trend = buildTrend();
  const top5 = leaks.slice(0, 5);
  const highCount = leaks.filter((l) => l.severity === "high").length;

  return (
    <div className="space-y-8">
      {/* Header — editorial, left-aligned. The dashboard is the hero. */}
      <div className="animate-rise max-w-3xl">
        <div className="mb-3 h-[3px] w-8 rounded-full bg-accent" aria-hidden />
        <div className="micro-label">LeakGuard · Revenue intelligence · 2025</div>
        <h1 className="mt-2 font-display text-[32px] font-bold leading-[1.08] tracking-tight text-ink sm:text-[44px] sm:leading-[1.05]">
          Where is the money leaking?
        </h1>
        <p className="tnum mt-3 max-w-2xl text-[15px] leading-relaxed text-ink2">
          Jan 2025 → Dec 2025 · 18,000 transactions analysed ·{" "}
          <span className="font-semibold text-brick-deep">{highCount} high-severity flags</span>{" "}
          detected across margin and return-rate anomalies
        </p>
        <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <Link href="/act" className="btn-primary w-full sm:w-auto">
            View recommended actions
            <IconArrowRight className="h-4 w-4" />
          </Link>
          <Link href="/detect" className="btn-secondary w-full sm:w-auto">
            Browse all 25 flags
            <IconArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>

      {/* KPI band */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 xl:grid-cols-6">
        <KpiCard kicker="Total revenue" value={fmtUSD(kpis.total_revenue)} sub="completed orders" />
        <KpiCard
          kicker="Margin"
          value={fmtPct(kpis.margin_pct)}
          sub={fmtUSD(kpis.total_margin)}
          tone="accent"
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
          tone="brick"
        />
        <KpiCard
          kicker="Stockout products"
          value={fmtNum(kpis.stockout_product_count)}
          sub="products at risk"
        />
        <KpiCard kicker="Avg discount" value={fmtPct(kpis.avg_discount_pct)} sub="across all orders" />
      </div>

      {/* Trend + donut */}
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="card lg:col-span-2">
          <div className="mb-1 flex flex-wrap items-baseline justify-between gap-2">
            <div>
              <h2 className="font-display text-lg font-bold tracking-tight text-ink">
                Demand trend & forecast
              </h2>
              <p className="mt-0.5 text-xs text-fog">
                Monthly completed quantity, all categories · forecast = 3-month moving average
              </p>
            </div>
            <span className="rounded-full border border-line bg-page px-2.5 py-1 font-mono text-[10px] font-medium uppercase tracking-wider text-fog">
              12 months + 3 forecast
            </span>
          </div>
          <TrendChart data={trend} />
        </div>
        <div className="card">
          <h2 className="font-display text-lg font-bold tracking-tight text-ink">Customer segments</h2>
          <p className="mt-0.5 text-xs text-fog">KMeans on RFM + return rate</p>
          <div className="mt-3">
            <SegmentDonut segments={segments} />
          </div>
        </div>
      </div>

      {/* Top-5 leak preview */}
      <div>
        <div className="mb-4 flex items-baseline justify-between">
          <h2 className="font-display text-xl font-bold tracking-tight text-ink">Top leak flags</h2>
          <Link
            href="/detect"
            className="inline-flex items-center gap-1 text-sm font-semibold text-accent-deep transition-colors hover:text-accent"
          >
            View all 25
            <IconArrowRight className="h-4 w-4" />
          </Link>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3 xl:grid-cols-5">
          {top5.map((l) => (
            <Link key={l.id} href={`/explain/${l.id}`} className="card card-hover block">
              <div className="flex items-center justify-between">
                <span className="tnum font-mono text-[11px] font-semibold text-fog">{l.id}</span>
                <SeverityBadge severity={l.severity} />
              </div>
              <div className="mt-2.5 text-sm font-semibold text-ink">{metricLabel[l.metric]}</div>
              <div className="mt-0.5 text-xs text-fog">
                {l.segment.category} · {l.segment.region} · {l.segment.channel}
              </div>
              <div className="tnum mt-3 flex items-baseline gap-2">
                <span className="font-display text-xl font-bold text-brick-deep">
                  {fmtPct(l.observed)}
                </span>
                <span className="text-xs text-fog">vs {fmtPct(l.expected)} expected</span>
              </div>
              <div className="tnum mt-1 font-mono text-[11px] text-fog">
                z = {l.z.toFixed(2)} · {fmtMonth(l.period)}
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
