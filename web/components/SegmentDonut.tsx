"use client";

import { useEffect, useState } from "react";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from "recharts";
import type { CustomerSegment } from "@/lib/data";
import ChartSkeleton from "./ChartSkeleton";

/* desaturated categorical set — no default chart colors */
const COLORS = ["#0C7A55", "#7E8F83", "#C08A3E", "#B2402B"];

function DonutTooltip({ active, payload, total }: any) {
  if (!active || !payload?.length) return null;
  const p = payload[0];
  const pct = ((Number(p.value) / total) * 100).toFixed(1);
  return (
    <div className="min-w-[200px] rounded-[10px] border border-line bg-paper px-3 py-2.5 shadow-[0_4px_16px_rgba(20,26,22,0.08)]">
      <div className="flex items-center gap-2">
        <span
          className="h-2 w-2 shrink-0 rounded-full"
          style={{ background: p.payload.fill }}
        />
        <span className="text-[13px] font-semibold text-ink">{p.payload.full.name}</span>
      </div>
      <div className="tnum mt-1 text-[13px] text-ink2">
        {Number(p.value).toLocaleString("en-US")} customers · {pct}%
      </div>
      {p.payload.full.return_rate !== undefined && (
        <div className="tnum mt-0.5 text-xs text-fog">
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
              innerRadius="64%"
              outerRadius="92%"
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
          <span className="font-display text-[26px] font-bold tracking-tight text-ink">
            {total.toLocaleString("en-US")}
          </span>
          <span className="font-mono text-[10px] font-medium uppercase tracking-[0.14em] text-fog">
            customers
          </span>
        </div>
      </div>
      {/* custom legend */}
      <ul className="tnum mt-3 space-y-2">
        {data.map((d) => (
          <li key={d.name} className="flex items-center gap-2.5 text-[13px]">
            <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: d.fill }} />
            <span className="truncate font-medium text-ink2">{d.full.name}</span>
            <span className="ml-auto pl-2 font-semibold text-ink">
              {((d.value / total) * 100).toFixed(1)}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
