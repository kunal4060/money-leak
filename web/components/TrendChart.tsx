"use client";

import { useEffect, useState } from "react";
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from "recharts";
import { TrendPoint } from "@/lib/data";
import ChartSkeleton from "./ChartSkeleton";

const ACCENT = "#0C7A55";
const FORECAST = "#98A29B";

function TrendTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const seen = new Set<string>();
  const rows = payload.filter((p: any) => {
    const k = String(p.dataKey);
    if (seen.has(k) || p.value == null) return false;
    seen.add(k);
    return true;
  });
  if (!rows.length) return null;
  return (
    <div className="min-w-[180px] rounded-[10px] border border-line bg-paper px-3 py-2.5 shadow-[0_4px_16px_rgba(20,26,22,0.08)]">
      <div className="tnum font-mono text-[10px] font-medium uppercase tracking-wider text-fog">
        {label}
      </div>
      <div className="mt-1.5 space-y-1">
        {rows.map((p: any) => (
          <div key={String(p.dataKey)} className="tnum flex items-center gap-2 text-[13px]">
            <span
              className="h-2 w-2 shrink-0 rounded-full"
              style={{ background: p.dataKey === "actual" ? ACCENT : FORECAST }}
            />
            <span className="text-ink2">{p.dataKey === "actual" ? "Actual" : "Forecast"}</span>
            <span className="ml-auto pl-4 font-semibold text-ink">
              {typeof p.value === "number" ? p.value.toLocaleString("en-US") : p.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function TrendChart({ data }: { data: TrendPoint[] }) {
  const [mounted, setMounted] = useState(false);
  const [narrow, setNarrow] = useState(false);
  useEffect(() => {
    setMounted(true);
    const mq = window.matchMedia("(max-width: 640px)");
    const onChange = () => setNarrow(mq.matches);
    onChange();
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  if (!mounted) return <ChartSkeleton label="Loading demand trend…" />;

  return (
    <>
      <div className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 8, right: 28, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="actualFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={ACCENT} stopOpacity={0.14} />
                <stop offset="100%" stopColor={ACCENT} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="#ECEFEA" vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 11, fill: "#6C7570", fontFamily: "var(--font-sans)" }}
              tickLine={false}
              axisLine={{ stroke: "#E1E6E0" }}
              interval={narrow ? 2 : 1}
              angle={-30}
              dy={12}
              height={52}
            />
            <YAxis
              tick={{ fontSize: 11, fill: "#6C7570", fontFamily: "var(--font-sans)" }}
              tickLine={false}
              axisLine={false}
              width={44}
              tickFormatter={(v: number) => `${(v / 1000).toFixed(1)}k`}
            />
            <Tooltip content={<TrendTooltip />} cursor={{ stroke: "#C9D1C9", strokeWidth: 1 }} />
            <ReferenceLine x="Dec 2025" stroke="#C9D1C9" strokeDasharray="4 4" />
            <Area
              type="monotone"
              dataKey="actual"
              fill="url(#actualFill)"
              stroke="none"
              connectNulls
              legendType="none"
              tooltipType="none"
            />
            <Line
              type="monotone"
              dataKey="actual"
              name="actual"
              stroke={ACCENT}
              strokeWidth={2.5}
              dot={false}
              activeDot={{ r: 4, strokeWidth: 2, stroke: "#fff", fill: ACCENT }}
              connectNulls
            />
            <Line
              type="monotone"
              dataKey="forecast"
              name="forecast"
              stroke={FORECAST}
              strokeWidth={2}
              strokeDasharray="6 4"
              dot={{ r: 2.5, fill: FORECAST, strokeWidth: 0 }}
              activeDot={{ r: 4, fill: FORECAST }}
              connectNulls
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-2 flex items-center justify-center gap-5 font-sans text-[12px] text-[#3F4742]">
        <span className="inline-flex items-center gap-1.5">
          <span aria-hidden="true" className="inline-block h-0 w-6 border-t-2 border-[#0C7A55]" />
          Actual qty
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span aria-hidden="true" className="inline-block h-0 w-6 border-t-2 border-dashed border-[#98A29B]" />
          Forecast qty
        </span>
      </div>
    </>
  );
}
