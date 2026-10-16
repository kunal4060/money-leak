import Link from "next/link";
import { notFound } from "next/navigation";
import {
  leaks,
  leakById,
  kpis,
  campaigns,
  fmtUSD,
  fmtPct,
  fmtNum,
  fmtMonth,
  metricLabel,
  parseEvidenceProduct,
  parseEvidenceDiscount,
} from "@/lib/data";
import SeverityBadge from "@/components/SeverityBadge";
import ObservedVsExpected from "@/components/ObservedVsExpected";

export function generateStaticParams() {
  return leaks.map((l) => ({ id: l.id }));
}

export default function ExplainPage({ params }: { params: { id: string } }) {
  const leak = leakById(params.id);
  if (!leak) notFound();

  const { product, worstMargin, txns } = parseEvidenceProduct(leak.evidence);
  const disc = parseEvidenceDiscount(leak.evidence);

  const channelCamp = (campaigns.by_channel as any[]).find(
    (c: any) => c.channel === leak.segment.channel
  );
  const categoryCamp = (campaigns.by_category as any[]).find(
    (c: any) => c.category === leak.segment.category
  );

  const strip: { label: string; value: string; hint?: string }[] = [
    { label: "Overall margin %", value: fmtPct(kpis.margin_pct) },
    { label: "Avg discount %", value: fmtPct(kpis.avg_discount_pct) },
    { label: "Cancel + return rate", value: fmtPct(kpis.cancel_return_rate) },
  ];
  if (disc.cell !== null)
    strip.push({
      label: "Cell discount vs category",
      value: `${disc.cell.toFixed(1)}% / ${disc.category!.toFixed(1)}%`,
    });
  if (channelCamp)
    strip.push({
      label: `${leak.segment.channel} channel`,
      value: `CAC ${fmtUSD(channelCamp.cac, 2)}`,
      hint: `ROAS proxy ${channelCamp.roas_proxy}`,
    });
  if (categoryCamp)
    strip.push({
      label: `${leak.segment.category} category`,
      value: `CAC ${fmtUSD(categoryCamp.cac, 2)}`,
      hint: `ROAS proxy ${categoryCamp.roas_proxy}`,
    });
  if (product && worstMargin)
    strip.push({
      label: "Worst product margin",
      value: `−$${Number(worstMargin.replace(/,/g, "")).toLocaleString("en-US")}`,
      hint: product,
    });
  if (txns) strip.push({ label: "Transactions in cell", value: txns });

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-slate-500">
        <Link href="/detect" className="font-medium text-emerald-700 hover:underline">
          ← All flags
        </Link>
        <span>/</span>
        <span className="tnum font-bold text-slate-800">{leak.id}</span>
      </div>

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="tnum text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
              {leak.id}
            </h1>
            <SeverityBadge severity={leak.severity} />
          </div>
          <p className="mt-1 text-sm text-slate-500">
            {metricLabel[leak.metric]} · {leak.segment.category} · {leak.segment.region} ·{" "}
            {leak.segment.channel} · {fmtMonth(leak.period)}
          </p>
        </div>
        <span className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-500">
          Detection: z-score within category, |z| &gt; 2.5 flagged
        </span>
      </div>

      {/* Main visual + evidence */}
      <div className="grid gap-4 lg:grid-cols-5">
        <div className="card lg:col-span-3">
          <h2 className="kicker mb-4">Observed vs expected</h2>
          <ObservedVsExpected observed={leak.observed} expected={leak.expected} z={leak.z} />
        </div>
        <div className="card border-l-4 border-l-emerald-500 lg:col-span-2">
          <h2 className="kicker mb-3">🧾 What the data says</h2>
          <p className="tnum text-[15px] leading-relaxed text-slate-800">{leak.evidence}</p>
          <div className="tnum mt-4 space-y-1.5 border-t border-slate-100 pt-3 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-500">Gap</span>
              <span className="font-bold text-red-600">
                {fmtPct(Math.abs(leak.observed - leak.expected))}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Direction</span>
              <span className="font-semibold text-slate-800">
                {leak.z < 0 ? "Worse than expected" : "Higher than expected"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Strength</span>
              <span className="font-semibold text-slate-800">
                {Math.abs(leak.z) > 3.5 ? "Extreme (|z| > 3.5)" : "|z| = " + Math.abs(leak.z).toFixed(2)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Segment context */}
      <div className="card">
        <h2 className="kicker mb-3">Segment context</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {(
            [
              ["Category", leak.segment.category],
              ["Region", leak.segment.region],
              ["Channel", leak.segment.channel],
              ["Month", fmtMonth(leak.segment.month)],
            ] as const
          ).map(([k, v]) => (
            <div key={k} className="rounded-xl bg-slate-50 px-4 py-3">
              <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{k}</div>
              <div className="mt-1 font-bold text-slate-900">{v}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Supporting metrics */}
      <div>
        <h2 className="mb-3 text-lg font-bold text-slate-900">Supporting metrics</h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {strip.map((s) => (
            <div key={s.label} className="card">
              <div className="kicker">{s.label}</div>
              <div className="tnum mt-2 text-xl font-extrabold text-slate-900">{s.value}</div>
              {s.hint && <div className="tnum mt-1 text-xs text-slate-500">{s.hint}</div>}
            </div>
          ))}
        </div>
        <p className="mt-3 text-xs text-slate-400">
          Benchmarks from portfolio-level KPIs and the campaign spend table — descriptive context only,
          not causal attribution.
        </p>
      </div>

      {/* Next step */}
      <div className="flex flex-wrap gap-3">
        <Link
          href="/act"
          className="rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-600"
        >
          🎯 See recommended actions
        </Link>
        <Link
          href="/detect"
          className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:border-slate-300"
        >
          ← Back to all flags
        </Link>
      </div>
    </div>
  );
}
