import { Fragment } from 'react';
import { cn } from '@/lib/utils';

export interface HeatmapCell {
  dow: number;        // 0 = 일, 1 = 월, ... 6 = 토
  hourBucket: string; // e.g. '09-11', '11-13', '13-15', '15-17', '17-19', '19+'
  count: number;
}

export interface ReservationHeatmapProps {
  cells: HeatmapCell[];
}

const DOW_LABELS = ['일', '월', '화', '수', '목', '금', '토'] as const;
const HOUR_BUCKETS = ['09-11', '11-13', '13-15', '15-17', '17-19', '19+'] as const;

function bucketLabel(bucket: string): string {
  if (bucket === '19+') return '19시~';
  const parts = bucket.split('-');
  return parts.length === 2 ? `${parts[0]}시` : bucket;
}

export function ReservationHeatmap({ cells }: ReservationHeatmapProps) {
  // Build lookup: `${dow}:${bucket}` → count
  const lookup = new Map<string, number>();
  for (const cell of cells) {
    lookup.set(`${cell.dow}:${cell.hourBucket}`, cell.count);
  }

  const maxCount = Math.max(...cells.map((c) => c.count), 1);

  return (
    <div
      role="table"
      aria-label="요일별·시간대별 예약 히트맵"
      className="overflow-x-auto"
    >
      {/* grid: label col (34px) + 7 day cols */}
      <div
        className="grid gap-1 min-w-[320px]"
        style={{ gridTemplateColumns: '34px repeat(7, 1fr)' }}
      >
        {/* Header row: empty corner + day labels */}
        <div aria-hidden="true" />
        {DOW_LABELS.map((day) => (
          <div
            key={day}
            className="text-center text-[11px] font-semibold text-muted-foreground py-0.5"
            role="columnheader"
            aria-label={`${day}요일`}
          >
            {day}
          </div>
        ))}

        {/* Data rows */}
        {HOUR_BUCKETS.map((bucket) => (
          <Fragment key={bucket}>
            {/* Row label */}
            <div
              className="flex items-center text-[11px] font-semibold text-muted-foreground"
              role="rowheader"
              aria-label={`${bucketLabel(bucket)} 시간대`}
            >
              {bucketLabel(bucket)}
            </div>

            {/* Cells for each dow */}
            {DOW_LABELS.map((day, dowIdx) => {
              const count = lookup.get(`${dowIdx}:${bucket}`) ?? 0;
              const alpha = count === 0 ? 0 : 0.08 + (count / maxCount) * 0.82;

              return (
                <div
                  key={`${bucket}-${dowIdx}`}
                  role="cell"
                  title={`${day}요일 ${bucketLabel(bucket)}: ${count}건`}
                  aria-label={`${day}요일 ${bucketLabel(bucket)} ${count}건`}
                  className={cn(
                    'rounded-md border border-transparent',
                    count === 0 && 'bg-muted',
                  )}
                  style={{
                    aspectRatio: '1.5 / 1',
                    ...(count > 0
                      ? { backgroundColor: `color-mix(in srgb, var(--brand) ${Math.round(alpha * 100)}%, transparent)` }
                      : {}),
                  }}
                />
              );
            })}
          </Fragment>
        ))}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-2 mt-3 text-[11px] text-muted-foreground">
        <span>적음</span>
        <div className="flex gap-0.5">
          {[0.1, 0.28, 0.46, 0.64, 0.82].map((a) => (
            <div
              key={a}
              className="w-4 h-3 rounded-sm"
              style={{ backgroundColor: `color-mix(in srgb, var(--brand) ${Math.round(a * 100)}%, transparent)` }}
              aria-hidden="true"
            />
          ))}
        </div>
        <span>많음</span>
      </div>
    </div>
  );
}
