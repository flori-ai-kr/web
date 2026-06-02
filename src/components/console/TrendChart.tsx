'use client';

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
} from 'recharts';
import type { TimeseriesPoint } from '@/types/admin';

const BRAND = 'var(--brand)';

function fmtDay(d: string): string {
  // "2026-06-03" → "6/03"
  const parts = d.split('-');
  return parts.length === 3 ? `${Number(parts[1])}/${parts[2]}` : d;
}

export function TrendChart({
  type,
  data,
  height = 150,
}: {
  type: 'line' | 'bar';
  data: TimeseriesPoint[];
  height?: number;
}) {
  if (!data || data.length === 0) {
    return (
      <div
        className="flex items-center justify-center rounded-lg border border-dashed border-border text-[12.5px] text-muted-foreground"
        style={{ height }}
      >
        데이터가 없습니다
      </div>
    );
  }

  const ticks = data.length > 1 ? [data[0].date, data[data.length - 1].date] : [data[0].date];

  return (
    <ResponsiveContainer width="100%" height={height}>
      {type === 'line' ? (
        <AreaChart data={data} margin={{ top: 8, right: 6, left: 6, bottom: 0 }}>
          <defs>
            <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={BRAND} stopOpacity={0.18} />
              <stop offset="100%" stopColor={BRAND} stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis dataKey="date" ticks={ticks} tickFormatter={fmtDay} tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }} />
          <Tooltip
            labelFormatter={(label) => fmtDay(String(label))}
            contentStyle={{ borderRadius: 8, border: '1px solid var(--border)', background: 'var(--card)', fontSize: 12 }}
          />
          <Area type="monotone" dataKey="count" stroke={BRAND} strokeWidth={2.5} fill="url(#trendFill)" />
        </AreaChart>
      ) : (
        <BarChart data={data} margin={{ top: 8, right: 6, left: 6, bottom: 0 }}>
          <XAxis dataKey="date" ticks={ticks} tickFormatter={fmtDay} tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }} />
          <Tooltip
            labelFormatter={(label) => fmtDay(String(label))}
            contentStyle={{ borderRadius: 8, border: '1px solid var(--border)', background: 'var(--card)', fontSize: 12 }}
          />
          <Bar dataKey="count" fill={BRAND} radius={[3, 3, 0, 0]} />
        </BarChart>
      )}
    </ResponsiveContainer>
  );
}
