"use client";

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

export default function AiUsageChart({ data }: { data: { day: string; label: string; messages: number; errors: number }[] }) {
  return (
    <div className="h-52 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 11, fill: "#94a3b8", fontWeight: 700 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            allowDecimals={false}
            tick={{ fontSize: 11, fill: "#94a3b8", fontWeight: 700 }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            cursor={{ fill: "rgba(148,163,184,0.08)" }}
            contentStyle={{
              borderRadius: 16,
              border: "1px solid #e2e8f0",
              fontSize: 12,
              fontWeight: 700,
            }}
          />
          <Bar dataKey="messages" name="Messages" radius={[8, 8, 0, 0]} fill="#6366f1" maxBarSize={38} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
