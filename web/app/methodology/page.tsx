import { methodology, RISK_CAVEAT } from "@/lib/data";
import { IconAlert } from "@/components/icons";

const m = methodology as any;

export default function MethodologyPage() {
  const cm = m.models.cancel_return_classifier;
  return (
    <div className="space-y-6">
      <div className="animate-rise">
        <div className="micro-label">Transparency</div>
        <h1 className="mt-1.5 font-display text-3xl font-bold tracking-tight text-ink sm:text-4xl">
          Methodology & data quality
        </h1>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-ink2">
          Everything here is computed from a synthetic DATATHON dataset. This page documents what was
          assumed, what is known to be artificial, and what should not be trusted.
        </p>
      </div>

      {/* Risk model honesty block */}
      <div className="rounded-xl border border-brick/25 bg-brick-soft p-5 sm:p-6">
        <h2 className="flex items-center gap-2 font-display text-base font-bold tracking-tight text-brick-deep">
          <IconAlert className="h-5 w-5" />
          Cancel/return risk model — no signal
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-brick-deep/90">
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
            <div key={k} className="rounded-lg border border-brick/15 bg-paper px-3 py-2">
              <dt className="font-mono text-[10px] font-medium uppercase tracking-wider text-brick-deep/60">
                {k}
              </dt>
              <dd className="mt-0.5 font-semibold text-brick-deep">{v}</dd>
            </div>
          ))}
        </dl>
        {/* 5-model sweep — best highlighted, rest compact */}
        <div className="mt-5">
          <h3 className="font-mono text-[10px] font-medium uppercase tracking-[0.12em] text-brick-deep/60">
            5-model sweep — same data, same split
          </h3>
          <div className="tnum mt-2 overflow-hidden rounded-lg border border-brick/20 text-sm">
            <div className="scroll-x overflow-x-auto">
              <table className="w-full min-w-[600px]">
              <thead>
                <tr className="bg-brick-deep/5 text-left font-mono text-[10px] uppercase tracking-wider text-brick-deep/60">
                  <th className="px-3 py-2 font-medium">Model</th>
                  <th className="px-3 py-2 font-medium">AUC</th>
                  <th className="px-3 py-2 font-medium">Precision</th>
                  <th className="px-3 py-2 font-medium">Recall</th>
                </tr>
              </thead>
              <tbody>
                {(m.models.model_comparison as any[]).map((r: any, i: number) => (
                  <tr
                    key={r.model}
                    className={
                      i === 0
                        ? "bg-accent-soft font-semibold text-accent-deep"
                        : "bg-paper text-brick-deep/75"
                    }
                  >
                    <td className="px-3 py-2">
                      {r.model}
                      {i === 0 && (
                        <span className="ml-2 rounded-full bg-accent px-2 py-0.5 font-mono text-[9px] font-semibold uppercase tracking-wider text-white">
                          highest
                        </span>
                      )}
                      {r.arch && (
                        <div className="mt-0.5 font-mono text-[10px] font-normal text-brick-deep/50">
                          {r.arch} &middot; {r.params.toLocaleString("en-US")} params &middot;{" "}
                          {r.epochs} epochs
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-2">{r.auc}</td>
                    <td className="px-3 py-2">{r.precision}</td>
                    <td className="px-3 py-2">{r.recall}</td>
                  </tr>
                ))}
              </tbody>
              </table>
            </div>
          </div>
          <p className="mt-2 text-xs leading-relaxed text-brick-deep/70">
            Best AUC 0.508 is still essentially a coin flip — the sweep proves the problem is the
            data (random labels), not the model choice. Full details in{" "}
            <span className="font-mono">ml/MODEL_COMPARISON.md</span>.
          </p>
        </div>
      </div>

      {/* Assumptions */}
      <div className="card">
        <h2 className="mb-4 font-display text-base font-bold tracking-tight text-ink">
          Assumptions & definitions
        </h2>
        <ul className="space-y-3 text-sm leading-relaxed text-ink2">
          {(m.assumptions as string[]).map((a: string, i: number) => (
            <li key={i} className="flex gap-3">
              <span className="tnum mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-sagesoft font-mono text-[10px] font-semibold text-ink2">
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
          <h2 className="mb-4 font-display text-base font-bold tracking-tight text-ink">
            Data quality — transactions
          </h2>
          <dl className="space-y-2.5 text-sm">
            <div className="flex justify-between border-b border-line/60 pb-2.5">
              <dt className="text-ink2">Rows</dt>
              <dd className="tnum font-semibold text-ink">
                {Number(m.data_quality.transactions_rows).toLocaleString("en-US")}
              </dd>
            </div>
            <div className="flex justify-between border-b border-line/60 pb-2.5">
              <dt className="text-ink2">Status values</dt>
              <dd className="tnum font-medium text-ink">
                {(m.data_quality.status_values as string[]).join(", ")}
              </dd>
            </div>
            <div className="flex justify-between rounded-lg bg-clay-soft px-3 py-2.5">
              <dt className="font-medium text-clay">Negative-margin transactions</dt>
              <dd className="tnum font-bold text-clay">
                {m.data_quality.negative_margin_pct}% — generator artifact
              </dd>
            </div>
            <div className="pt-1">
              <dt className="mb-1.5 font-mono text-[10px] font-medium uppercase tracking-wider text-fog">
                Null counts
              </dt>
              <dd className="tnum grid grid-cols-2 gap-1.5 text-xs text-ink2">
                {Object.entries(m.data_quality.null_counts as Record<string, number>).map(([k, v]) => (
                  <div key={k} className="flex justify-between rounded-md bg-page px-2 py-1.5">
                    <span>{k}</span>
                    <span className="font-semibold">{v}</span>
                  </div>
                ))}
              </dd>
            </div>
          </dl>
        </div>
        <div className="card">
          <h2 className="mb-4 font-display text-base font-bold tracking-tight text-ink">
            Known synthetic artifacts
          </h2>
          <ul className="space-y-2.5 text-sm leading-relaxed text-ink2">
            <li className="rounded-lg border border-clay/20 bg-clay-soft/60 p-3.5">
              <strong className="text-ink">38.07% negative margins.</strong> 5,315 completed
              transactions have negative margin — an artifact of the generator independently
              randomizing costs, prices, and statuses.
            </li>
            <li className="rounded-lg border border-clay/20 bg-clay-soft/60 p-3.5">
              <strong className="text-ink">Statuses carry no signal.</strong> Cancelled/returned rows
              are assigned essentially at random; the classifier found nothing to learn (AUC 0.49).
            </li>
            <li className="rounded-lg border border-clay/20 bg-clay-soft/60 p-3.5">
              <strong className="text-ink">Flags include synthetic noise.</strong> Many leak flags are
              clumps of generator noise in small cells (8–24 transactions), not business-certified
              drivers. The Act page impact numbers are rough estimates for triage, not commitments.
            </li>
            <li className="rounded-lg border border-clay/20 bg-clay-soft/60 p-3.5">
              <strong className="text-ink">ROAS is a proxy.</strong> Attributed revenue ≈ conversions
              × avg order value of that channel/category — no true attribution key exists.
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
