import {COMMUNITY_CATEGORIES, type CommunityCategory} from '@/types/database';
import {cn} from '@/lib/utils';

export function CommunityCategoryBadge({
  category,
  className,
}: {
  category: CommunityCategory;
  className?: string;
}) {
  const meta = COMMUNITY_CATEGORIES.find((c) => c.value === category);
  if (!meta) return null;

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium',
        className,
      )}
      style={{ backgroundColor: `${meta.color}1a`, color: meta.color }}
    >
      {meta.label}
    </span>
  );
}
