import { methodology, RISK_CAVEAT } from "@/lib/data";

const m = methodology as any;

export default function MethodologyPage() {
  const cm = m.models.cancel_return_classifier;
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
          Methodology & data quality
        </h1>
        <p className="mt-1 max-w-3xl text-sm text-slate-500">
          Everything here is computed from a synthetic DATATHON dataset. This page documents what was
          assumed, what is known to be artificial, and what should not be trusted.
        </p>
      </div>

      {/* Risk model honesty block */}
      <div className="rounded-2xl border-2 border-red-200 bg-red-50 p-5">
        <h2 className="text-base font-bold text-red-900">⚠️ Cancel/return risk model — no signal</h2>
        <p className="mt-2 text-sm leading-relaxed text-red-800">
          {RISK_CAVEAT} The XGBoost cancel/return classifier reached{" "}
          <strong>AUC ≈ {cm.auc}</strong> — no better than a coin flip. Statuses appear randomly
          assigned by the data generator (bad rate ≈ 18% is uniform across all feature slices), and
          recall is {cm.recall}. Any risk scores in this product are schema placeholders and must not
          drive real decisions.
        </p>
        <dl className="tnum mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
          {(
            [
              ["Algorithm", cm.algorithm],
              ["AUC", cm.auc],
              ["Recall", cm.recall],
              ["Precision", cm.precision],
            ] as const
          ).map(([k, v]) => (
            <div key={k} className="rounded-lg bg-white/70 px-3 py-2">
              <dt className="text-[11px] font-semibold uppercase tracking-wide text-red-700/70">{k}</dt>
              <dd className="font-bold text-red-900">{v}</dd>
            </div>
          ))}
        </dl>
      </div>

      {/* Assumptions */}
      <div className="card">
        <h2 className="mb-3 text-base font-bold text-slate-900">Assumptions & definitions</h2>
        <ul className="space-y-2.5 text-sm leading-relaxed text-slate-700">
          {(m.assumptions as string[]).map((a: string, i: number) => (
            <li key={i} className="flex gap-2.5">
              <span className="tnum mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-slate-100 text-[10px] font-bold text-slate-500">
                {i + 1}
              </span>
              <span>{a}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Data quality */}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="card">
          <h2 className="mb-3 text-base font-bold text-slate-900">Data quality — transactions</h2>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-slate-500">Rows</dt>
              <dd className="tnum font-bold text-slate-900">
                {Number(m.data_quality.transactions_rows).toLocaleString("en-US")}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500">Status values</dt>
              <dd className="tnum font-semibold text-slate-800">
                {(m.data_quality.status_values as string[]).join(", ")}
              </dd>
            </div>
            <div className="flex justify-between rounded-lg bg-amber-50 px-3 py-2">
              <dt className="font-medium text-amber-800">Negative-margin transactions</dt>
              <dd className="tnum font-extrabold text-amber-900">
                {m.data_quality.negative_margin_pct}% — generator artifact
              </dd>
            </div>
            <div className="mt-2">
              <dt className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
                Null counts
              </dt>
              <dd className="tnum grid grid-cols-2 gap-1 text-xs text-slate-600">
                {Object.entries(m.data_quality.null_counts as Record<string, number>).map(([k, v]) => (
                  <div key={k} className="flex justify-between rounded bg-slate-50 px-2 py-1">
                    <span>{k}</span>
                    <span className="font-bold">{v}</span>
                  </div>
                ))}
              </dd>
            </div>
          </dl>
        </div>
        <div className="card">
          <h2 className="mb-3 text-base font-bold text-slate-900">Known synthetic artifacts</h2>
          <ul className="space-y-3 text-sm leading-relaxed text-slate-700">
            <li className="rounded-lg border border-amber-200 bg-amber-50 p-3">
              <strong>38.07% negative margins.</strong> 5,315 completed transactions have negative
              margin — an artifact of the generator independently randomizing costs, prices, and
              statuses.
            </li>
            <li className="rounded-lg border border-amber-200 bg-amber-50 p-3">
              <strong>Statuses carry no signal.</strong> Cancelled/returned rows are assigned
              essentially at random; the classifier found nothing to learn (AUC 0.49).
            </li>
            <li className="rounded-lg border border-amber-200 bg-amber-50 p-3">
              <strong>Flags include synthetic noise.</strong> Many leak flags are clumps of generator
              noise in small cells (8–24 transactions), not business-certified drivers. The Act page
              impact numbers are rough estimates for triage, not commitments.
            </li>
            <li className="rounded-lg border border-amber-200 bg-amber-50 p-3">
              <strong>ROAS is a proxy.</strong> Attributed revenue ≈ conversions × avg order value of
              that channel/category — no true attribution key exists.
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
