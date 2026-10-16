import Link from "next/link";
import { buildActions, kpis, fmtUSD } from "@/lib/data";
import SeverityBadge from "@/components/SeverityBadge";
import { leaks } from "@/lib/data";

const effortStyle: Record<string, string> = {
  Low: "bg-emerald-50 text-emerald-700 border-emerald-200",
  Medium: "bg-amber-50 text-amber-700 border-amber-200",
  High: "bg-red-50 text-red-700 border-red-200",
};

export default function ActPage() {
  const actions = buildActions();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
          🎯 Act — recommended moves
        </h1>
        <p className="mt-1 max-w-3xl text-sm text-slate-500">
          Prioritised playbook for the {actions.length} high-severity flags. Impact numbers are
          rough directional <strong className="text-slate-700">estimates</strong> — sized against{" "}
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
                <span className="tnum flex h-8 w-8 items-center justify-center rounded-lg bg-slate-900 text-sm font-extrabold text-white">
                  {i + 1}
                </span>
                <div className="flex items-center gap-2">
                  <span
                    className={`rounded-full border px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${effortStyle[a.effort]}`}
                  >
                    {a.effort} effort
                  </span>
                  <SeverityBadge severity={leak.severity} />
                </div>
              </div>

              <h2 className="mt-3 text-base font-bold leading-snug text-slate-900">{a.title}</h2>

              <div className="mt-3 rounded-xl bg-slate-50 p-3">
                <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                  Why — evidence
                </div>
                <p className="tnum mt-1 text-[13px] leading-relaxed text-slate-700">{a.why}</p>
              </div>

              <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50/60 p-3">
                <div className="text-[11px] font-semibold uppercase tracking-wide text-emerald-700">
                  Profit impact
                </div>
                <p className="tnum mt-1 text-sm font-bold text-emerald-800">{a.impactEstimate}</p>
              </div>

              <div className="mt-auto pt-4">
                <Link
                  href={`/explain/${a.id}`}
                  className="text-sm font-semibold text-emerald-700 hover:underline"
                >
                  Inspect {a.id} in detail →
                </Link>
              </div>
            </div>
          );
        })}
      </div>

      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">
        <strong>Honesty note.</strong> This dashboard is built on synthetic DATATHON data. The
        anomaly detector also flags clumps of synthetic noise (see{" "}
        <Link href="/methodology" className="font-semibold underline">
          methodology
        </Link>
        ), and 38.07% of completed transactions show negative margins — a generator artifact. Treat
        every action card as a lead to investigate, not a prescription.
      </div>
    </div>
  );
}
