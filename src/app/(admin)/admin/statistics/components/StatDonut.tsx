'use client';

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';

export interface StatDonutItem {
  label: string;
  value: number;
  color: string;
}

export interface StatDonutProps {
  items: StatDonutItem[];
  centerLabel?: string;
}

export function StatDonut({ items, centerLabel }: StatDonutProps) {
  const total = items.reduce((sum, item) => sum + item.value, 0);

  if (items.length === 0 || total === 0) {
    return (
      <div
        className="flex items-center justify-center text-sm text-muted-foreground py-8"
        role="img"
        aria-label="데이터가 없습니다"
      >
        데이터가 없습니다
      </div>
    );
  }

  const displayCenter = centerLabel ?? total.toLocaleString('ko-KR');

  return (
    <div
      className="flex items-center gap-4"
      role="img"
      aria-label={`도넛 차트: 합계 ${displayCenter}`}
    >
      {/* Donut chart */}
      <div className="shrink-0" style={{ width: 120, height: 120 }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={items}
              cx="50%"
              cy="50%"
              innerRadius={36}
              outerRadius={52}
              dataKey="value"
              strokeWidth={0}
              startAngle={90}
              endAngle={-270}
            >
              {items.map((item, idx) => (
                <Cell key={idx} fill={item.color} />
              ))}
            </Pie>
            <Tooltip
              formatter={(val, _name, entry) => {
                const pct = total > 0 ? Math.round(((val as number) / total) * 100) : 0;
                return [`${pct}%`, entry.payload.label as string];
              }}
              contentStyle={{
                borderRadius: 8,
                border: '1px solid var(--border)',
                background: 'var(--card)',
                fontSize: 12,
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Legend */}
      <div className="flex flex-col gap-2 flex-1 min-w-0" role="list">
        {items.map((item, idx) => {
          const pct = total > 0 ? Math.round((item.value / total) * 100) : 0;
          return (
            <div key={idx} className="flex items-center justify-between text-[13px]" role="listitem">
              <span className="flex items-center gap-2 text-foreground min-w-0 truncate">
                <span
                  className="w-2.5 h-2.5 rounded-sm shrink-0"
                  style={{ backgroundColor: item.color }}
                  aria-hidden="true"
                />
                {item.label}
              </span>
              <span className="text-muted-foreground tabular-nums ml-2 shrink-0">{pct}%</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
