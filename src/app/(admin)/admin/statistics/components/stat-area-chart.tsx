'use client';

import { useId } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
} from 'recharts';

export interface StatAreaChartDataPoint {
  date: string;
  value: number;
}

export interface StatAreaChartProps {
  data: StatAreaChartDataPoint[];
  type?: 'area' | 'bar';
  color?: string;
  height?: number;
  valueFormatter?: (n: number) => string;
}

function fmtDay(d: string): string {
  const parts = d.split('-');
  return parts.length === 3 ? `${Number(parts[1])}/${parts[2]}` : d;
}

export function StatAreaChart({
  data,
  type = 'area',
  color = 'var(--brand)',
  height = 160,
  valueFormatter,
}: StatAreaChartProps) {
  const gradId = `statAreaFill-${useId().replace(/:/g, '')}`;

  if (!data || data.length === 0) {
    return (
      <div
        className="flex items-center justify-center rounded-lg border border-dashed border-border text-[12.5px] text-muted-foreground"
        style={{ height }}
        role="img"
        aria-label="데이터가 없습니다"
      >
        데이터가 없습니다
      </div>
    );
  }

  const ticks =
    data.length > 1 ? [data[0].date, data[data.length - 1].date] : [data[0].date];

  const tooltipFormatter = (val: number) =>
    valueFormatter ? valueFormatter(val) : val.toLocaleString('ko-KR');

  return (
    <div role="img" aria-label="추이 차트">
      <ResponsiveContainer width="100%" height={height}>
        {type === 'area' ? (
          <AreaChart data={data} margin={{ top: 8, right: 6, left: 6, bottom: 0 }}>
            <defs>
              <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity={0.18} />
                <stop offset="100%" stopColor={color} stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="date"
              ticks={ticks}
              tickFormatter={fmtDay}
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }}
            />
            <Tooltip
              labelFormatter={(label) => fmtDay(String(label))}
              formatter={(val) => [tooltipFormatter(val as number), '']}
              contentStyle={{
                borderRadius: 8,
                border: '1px solid var(--border)',
                background: 'var(--card)',
                fontSize: 12,
              }}
            />
            <Area
              type="monotone"
              dataKey="value"
              stroke={color}
              strokeWidth={2.5}
              fill={`url(#${gradId})`}
            />
          </AreaChart>
        ) : (
          <BarChart data={data} margin={{ top: 8, right: 6, left: 6, bottom: 0 }}>
            <XAxis
              dataKey="date"
              ticks={ticks}
              tickFormatter={fmtDay}
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }}
            />
            <Tooltip
              labelFormatter={(label) => fmtDay(String(label))}
              formatter={(val) => [tooltipFormatter(val as number), '']}
              contentStyle={{
                borderRadius: 8,
                border: '1px solid var(--border)',
                background: 'var(--card)',
                fontSize: 12,
              }}
            />
            <Bar dataKey="value" fill={color} radius={[3, 3, 0, 0]} />
          </BarChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}
