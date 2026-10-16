"use client";

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

export default function TrendChart({ data }: { data: TrendPoint[] }) {
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 11, fill: "#64748b" }}
            tickLine={false}
            axisLine={{ stroke: "#cbd5e1" }}
            interval={0}
            angle={-30}
            dy={12}
            height={52}
          />
          <YAxis
            tick={{ fontSize: 11, fill: "#64748b" }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v: number) => `${(v / 1000).toFixed(1)}k`}
          />
          <Tooltip
            contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 12 }}
            formatter={(value: any, name: string) => [
              typeof value === "number" ? value.toLocaleString("en-US") : value,
              name === "actual" ? "Actual qty" : "Forecast qty",
            ]}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <ReferenceLine x="Dec 2025" stroke="#94a3b8" strokeDasharray="4 4" />
          <Line
            type="monotone"
            dataKey="actual"
            name="actual"
            stroke="#10b981"
            strokeWidth={2.5}
            dot={false}
            activeDot={{ r: 5 }}
            connectNulls
          />
          <Line
            type="monotone"
            dataKey="forecast"
            name="forecast"
            stroke="#f59e0b"
            strokeWidth={2}
            strokeDasharray="6 4"
            dot={{ r: 3, fill: "#f59e0b" }}
            connectNulls
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
