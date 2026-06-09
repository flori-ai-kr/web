import { cn } from '@/lib/utils';

export interface StatBarListItem {
  label: string;
  value: number;
  valueText: string;
  color?: string;
}

export interface StatBarListProps {
  items: StatBarListItem[];
  emptyMessage?: string;
}

export function StatBarList({ items, emptyMessage = '데이터가 없습니다' }: StatBarListProps) {
  if (items.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-6 text-center">{emptyMessage}</p>
    );
  }

  const max = Math.max(...items.map((i) => i.value), 1);

  return (
    <div className="flex flex-col gap-2.5" role="list" aria-label="막대 목록">
      {items.map((item, idx) => {
        const pct = Math.max((item.value / max) * 100, item.value > 0 ? 3 : 0);
        const fillStyle = item.color
          ? { backgroundColor: item.color }
          : undefined;

        return (
          <div key={idx} className="space-y-1.5" role="listitem">
            <div className="flex items-center justify-between text-sm">
              <span className="text-foreground font-semibold truncate">{item.label}</span>
              <span className="text-xs text-muted-foreground ml-2 shrink-0 tabular-nums font-semibold">
                {item.valueText}
              </span>
            </div>
            <div
              className="h-2 bg-muted rounded-full overflow-hidden"
              role="presentation"
              aria-hidden="true"
            >
              <div
                className={cn('h-full rounded-full transition-[width]', !item.color && 'bg-brand/60')}
                style={{ width: `${pct}%`, ...(item.color ? fillStyle : {}) }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
