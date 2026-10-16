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
import { IconAlert, IconArrowRight } from "@/components/icons";

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

  const hasRoasProxy = strip.some((s) => s.hint?.includes("ROAS"));

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-sm text-ink2">
        <Link
          href="/detect"
          className="rounded-md px-1 py-0.5 font-medium text-accent-deep transition-colors hover:bg-accent-soft"
        >
          ← All flags
        </Link>
        <span aria-hidden className="text-line">/</span>
        <span className="tnum font-mono text-[13px] font-semibold text-ink">{leak.id}</span>
      </nav>

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="tnum font-mono text-2xl font-bold tracking-tight text-ink sm:text-3xl">
              {leak.id}
            </h1>
            <SeverityBadge severity={leak.severity} />
          </div>
          <p className="mt-1.5 text-sm text-ink2">
            {metricLabel[leak.metric]} · {leak.segment.category} · {leak.segment.region} ·{" "}
            {leak.segment.channel} · {fmtMonth(leak.period)}
          </p>
        </div>
        <span className="rounded-lg border border-line bg-paper px-3 py-1.5 font-mono text-[11px] text-fog">
          Detection: z-score within category, |z| &gt; 2.5 flagged
        </span>
      </div>

      {/* Main visual + evidence */}
      <div className="grid gap-4 lg:grid-cols-5">
        <div className="card lg:col-span-3">
          <h2 className="kicker mb-4">Observed vs expected</h2>
          <ObservedVsExpected observed={leak.observed} expected={leak.expected} z={leak.z} />
        </div>
        <div className="card border-l-2 !border-l-accent lg:col-span-2">
          <h2 className="kicker mb-3">What the data says</h2>
          <p className="tnum text-[15px] leading-relaxed text-ink">{leak.evidence}</p>
          <div className="tnum mt-4 space-y-2 border-t border-line pt-3.5 text-sm">
            <div className="flex justify-between">
              <span className="text-fog">Gap</span>
              <span className="font-semibold text-brick-deep">
                {fmtPct(Math.abs(leak.observed - leak.expected))}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-fog">Direction</span>
              <span className="font-medium text-ink">
                {leak.z < 0 ? "Worse than expected" : "Higher than expected"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-fog">Strength</span>
              <span className="font-medium text-ink">
                {Math.abs(leak.z) > 3.5 ? "Extreme (|z| > 3.5)" : "|z| = " + Math.abs(leak.z).toFixed(2)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Segment context */}
      <div className="card">
        <h2 className="kicker mb-3">Segment context</h2>
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          {(
            [
              ["Category", leak.segment.category],
              ["Region", leak.segment.region],
              ["Channel", leak.segment.channel],
              ["Month", fmtMonth(leak.segment.month)],
            ] as const
          ).map(([k, v]) => (
            <div key={k} className="rounded-lg bg-page px-4 py-3">
              <div className="font-mono text-[10px] font-medium uppercase tracking-wider text-fog">{k}</div>
              <div className="mt-1 text-sm font-semibold text-ink">{v}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Supporting metrics */}
      <div>
        <h2 className="mb-3 font-display text-lg font-bold tracking-tight text-ink">
          Supporting metrics
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
          {strip.map((s) => (
            <div key={s.label} className="card card-hover">
              <div className="kicker">{s.label}</div>
              <div className="tnum mt-2 font-display text-xl font-bold text-ink">{s.value}</div>
              {s.hint && <div className="tnum mt-1 font-mono text-[11px] text-fog">{s.hint}</div>}
            </div>
          ))}
        </div>
        <p className="mt-3 text-xs leading-relaxed text-fog">
          Benchmarks from portfolio-level KPIs and the campaign spend table — descriptive context only,
          not causal attribution.
        </p>
        {hasRoasProxy && (
          <p className="mt-2 flex items-start gap-1.5 text-xs leading-relaxed text-fog">
            <IconAlert className="mt-0.5 h-3.5 w-3.5 shrink-0 text-clay" aria-hidden />
            <span>
              ROAS shown is a <strong>proxy metric, not real ROAS</strong> (attributed revenue ≈
              conversions × avg order value) — see{" "}
              <Link href="/methodology" className="font-semibold text-accent-deep hover:underline">
                Methodology
              </Link>
              .
            </span>
          </p>
        )}
      </div>

      {/* Next step */}
      <div className="flex flex-wrap gap-3">
        <Link href="/act" className="btn-primary">
          See recommended actions
          <IconArrowRight className="h-4 w-4" />
        </Link>
        <Link href="/detect" className="btn-secondary">
          ← Back to all flags
        </Link>
      </div>
    </div>
  );
}
