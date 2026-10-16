"use client";

import { useEffect, useState } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
} from "recharts";
import { TrendPoint } from "@/lib/data";
import ChartSkeleton from "./ChartSkeleton";

function TrendTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="min-w-[180px] rounded-xl border border-slate-200 bg-white/95 px-3 py-2.5 shadow-xl backdrop-blur">
      <div className="tnum text-[11px] font-bold uppercase tracking-wider text-slate-400">
        {label}
      </div>
      <div className="mt-1.5 space-y-1">
        {payload.map((p: any) => (
          <div key={String(p.dataKey)} className="tnum flex items-center gap-2 text-sm">
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ background: p.dataKey === "actual" ? "#10b981" : "#f59e0b" }}
            />
            <span className="text-slate-500">{p.dataKey === "actual" ? "Actual" : "Forecast"}</span>
            <span className="ml-auto pl-4 font-bold text-slate-900">
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
  useEffect(() => {
    setMounted(true);
  }, []);
  if (!mounted) return <ChartSkeleton label="Loading demand trend…" />;

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="actualStroke" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#0ea5e9" />
              <stop offset="100%" stopColor="#10b981" />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 11, fill: "#64748b" }}
            tickLine={false}
            axisLine={{ stroke: "#cbd5e1" }}
            interval={1}
            angle={-30}
            dy={12}
            height={52}
          />
          <YAxis
            tick={{ fontSize: 11, fill: "#64748b" }}
            tickLine={false}
            axisLine={false}
            width={44}
            tickFormatter={(v: number) => `${(v / 1000).toFixed(1)}k`}
          />
          <Tooltip content={<TrendTooltip />} cursor={{ stroke: "#cbd5e1", strokeWidth: 1 }} />
          <Legend
            wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
            formatter={(v: string) => (v === "actual" ? "Actual qty" : "Forecast qty")}
            iconType="plainline"
          />
          <ReferenceLine x="Dec 2025" stroke="#94a3b8" strokeDasharray="4 4" />
          <Line
            type="monotone"
            dataKey="actual"
            name="actual"
            stroke="url(#actualStroke)"
            strokeWidth={3}
            dot={false}
            activeDot={{ r: 5, strokeWidth: 2, stroke: "#fff" }}
            connectNulls
          />
          <Line
            type="monotone"
            dataKey="forecast"
            name="forecast"
            stroke="#f59e0b"
            strokeWidth={2}
            strokeDasharray="6 4"
            dot={{ r: 3, fill: "#f59e0b", strokeWidth: 0 }}
            activeDot={{ r: 5 }}
            connectNulls
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
