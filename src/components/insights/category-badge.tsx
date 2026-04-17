import {TREND_CATEGORIES, type TrendCategory} from '@/types/database';
import {cn} from '@/lib/utils';

interface CategoryBadgeProps {
  category: TrendCategory;
  className?: string;
}

export function CategoryBadge({ category, className }: CategoryBadgeProps) {
  const meta = TREND_CATEGORIES.find((c) => c.value === category);
  if (!meta) return null;

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium',
        className,
      )}
      style={{
        backgroundColor: `${meta.color}1a`,
        color: meta.color,
      }}
    >
      {meta.label}
    </span>
  );
}
