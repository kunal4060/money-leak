"use client";

import { useEffect, useState } from "react";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from "recharts";
import type { CustomerSegment } from "@/lib/data";
import ChartSkeleton from "./ChartSkeleton";

const COLORS = ["#10b981", "#0ea5e9", "#f59e0b", "#ef4444"];

function DonutTooltip({ active, payload, total }: any) {
  if (!active || !payload?.length) return null;
  const p = payload[0];
  const pct = ((Number(p.value) / total) * 100).toFixed(1);
  return (
    <div className="min-w-[200px] rounded-xl border border-slate-200 bg-white/95 px-3 py-2.5 shadow-xl backdrop-blur">
      <div className="flex items-center gap-2">
        <span
          className="h-2.5 w-2.5 shrink-0 rounded-full"
          style={{ background: p.payload.fill }}
        />
        <span className="text-sm font-bold text-slate-900">{p.payload.full.name}</span>
      </div>
      <div className="tnum mt-1 text-sm text-slate-600">
        {Number(p.value).toLocaleString("en-US")} customers · {pct}%
      </div>
      {p.payload.full.return_rate !== undefined && (
        <div className="tnum mt-0.5 text-xs text-slate-500">
          Return rate {Number(p.payload.full.return_rate).toFixed(1)}%
        </div>
      )}
    </div>
  );
}

export default function SegmentDonut({ segments }: { segments: CustomerSegment[] }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);
  if (!mounted) return <ChartSkeleton label="Loading customer segments…" />;

  const total = segments.reduce((s, x) => s + x.size, 0);
  const data = segments.map((s, i) => ({
    name: s.name.split("—")[0].trim() || s.name,
    value: s.size,
    full: s,
    fill: COLORS[i % COLORS.length],
  }));

  return (
    <div className="w-full">
      <div className="relative h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              innerRadius="62%"
              outerRadius="90%"
              paddingAngle={3}
              strokeWidth={0}
              cornerRadius={4}
            >
              {data.map((d, i) => (
                <Cell key={i} fill={d.fill} />
              ))}
            </Pie>
            <Tooltip content={<DonutTooltip total={total} />} />
          </PieChart>
        </ResponsiveContainer>
        {/* center total */}
        <div className="tnum pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-extrabold tracking-tight text-slate-900">
            {total.toLocaleString("en-US")}
          </span>
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            customers
          </span>
        </div>
      </div>
      {/* custom legend */}
      <ul className="tnum mt-2 space-y-1.5">
        {data.map((d) => (
          <li key={d.name} className="flex items-center gap-2 text-sm">
            <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: d.fill }} />
            <span className="truncate font-medium text-slate-700">{d.full.name}</span>
            <span className="ml-auto pl-2 font-bold text-slate-900">
              {((d.value / total) * 100).toFixed(1)}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
