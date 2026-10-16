"use client";

import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from "recharts";
import type { CustomerSegment } from "@/lib/data";

const COLORS = ["#10b981", "#0ea5e9", "#f59e0b", "#ef4444"];

export default function SegmentDonut({ segments }: { segments: CustomerSegment[] }) {
  const total = segments.reduce((s, x) => s + x.size, 0);
  const data = segments.map((s) => ({
    name: s.name.split("—")[0].trim() || s.name,
    value: s.size,
    full: s,
  }));
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            innerRadius="58%"
            outerRadius="88%"
            paddingAngle={2}
            strokeWidth={0}
          >
            {data.map((_, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 12 }}
            formatter={(value: any, _name: any, props: any) => [
              `${Number(value).toLocaleString("en-US")} customers (${(
                (Number(value) / total) *
                100
              ).toFixed(1)}%)`,
              props.payload.full.name,
            ]}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
