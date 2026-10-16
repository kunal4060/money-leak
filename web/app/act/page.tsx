import Link from "next/link";
import { buildActions, kpis, fmtUSD } from "@/lib/data";
import SeverityBadge from "@/components/SeverityBadge";
import { leaks } from "@/lib/data";
import { IconArrowRight } from "@/components/icons";

const effortStyle: Record<string, string> = {
  Low: "border border-accent/25 bg-accent-soft text-accent-deep",
  Medium: "border border-clay/25 bg-clay-soft text-clay",
  High: "border border-brick/25 bg-brick-soft text-brick-deep",
};

export default function ActPage() {
  const actions = buildActions();

  return (
    <div className="space-y-6">
      <div className="animate-rise max-w-3xl">
        <div className="micro-label">Action plan</div>
        <h1 className="mt-1.5 font-display text-3xl font-bold tracking-tight text-ink sm:text-4xl">
          Act — recommended moves
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-ink2">
          Prioritised playbook for the {actions.length} high-severity flags. Impact numbers are
          rough directional <strong className="text-ink">estimates</strong> — sized against{" "}
          {fmtUSD(kpis.lost_revenue)} of lost revenue — not committed savings. 38% of completed
          transactions carry negative margins, so verify every flag against the underlying data
          before acting.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {actions.map((a, i) => {
          const leak = leaks.find((l) => l.id === a.id)!;
          return (
            <div key={a.id} className="card card-hover flex flex-col">
              <div className="flex items-start justify-between gap-2">
                <span className="tnum flex h-8 w-8 items-center justify-center rounded-lg bg-ink font-mono text-sm font-semibold text-white">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div className="flex items-center gap-2">
                  <span
                    className={`rounded-full px-2.5 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wider ${effortStyle[a.effort]}`}
                  >
                    {a.effort} effort
                  </span>
                  <SeverityBadge severity={leak.severity} />
                </div>
              </div>

              <h2 className="mt-3 font-display text-[17px] font-bold leading-snug tracking-tight text-ink">
                {a.title}
              </h2>

              <div className="mt-3 rounded-lg border border-line bg-page p-3.5">
                <div className="kicker">Why — evidence</div>
                <p className="tnum mt-1.5 text-[13px] leading-relaxed text-ink2">{a.why}</p>
              </div>

              <div className="mt-2.5 rounded-lg border border-accent/25 bg-accent-soft p-3.5">
                <div className="kicker !text-accent-deep/70">Profit impact</div>
                <p className="tnum mt-1.5 text-sm font-semibold text-accent-deep">
                  {a.impactEstimate}
                </p>
              </div>

              <div className="mt-auto pt-4">
                <Link
                  href={`/explain/${a.id}`}
                  className="inline-flex items-center gap-1.5 text-sm font-semibold text-accent-deep transition-colors hover:text-accent"
                >
                  Inspect {a.id} in detail
                  <IconArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          );
        })}
      </div>

      <div className="rounded-xl border border-clay/25 bg-clay-soft p-5 text-sm leading-relaxed text-clay">
        <strong className="text-ink">Honesty note.</strong> This dashboard is built on synthetic
        DATATHON data. The anomaly detector also flags clumps of synthetic noise (see{" "}
        <Link href="/methodology" className="font-semibold text-accent-deep underline">
          methodology
        </Link>
        ), and 38.07% of completed transactions show negative margins — a generator artifact. Treat
        every action card as a lead to investigate, not a prescription.
      </div>
    </div>
  );
}
