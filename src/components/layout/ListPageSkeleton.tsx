import { Skeleton } from '@/components/ui/skeleton';

/**
 * 목록 페이지 공통 로딩 스켈레톤.
 * 각 라우트의 loading.tsx에서 재사용해 필터/월 변경 시 빈 화면 멈춤 대신
 * 레이아웃이 유지되는 폴백을 제공한다(Linear식 "자리 유지" 로딩).
 */
export function ListPageSkeleton({
  variant = 'list',
}: {
  variant?: 'list' | 'grid';
}) {
  return (
    <div className="space-y-6">
      {/* 페이지 헤더 */}
      <div className="flex items-end justify-between gap-3">
        <div className="space-y-2">
          <Skeleton className="h-7 w-40" />
          <Skeleton className="h-4 w-56" />
        </div>
        <Skeleton className="h-9 w-24 rounded-md" />
      </div>

      {/* 요약/필터 줄 */}
      <div className="flex flex-wrap gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-8 w-20 rounded-full" />
        ))}
      </div>

      {variant === 'grid' ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {Array.from({ length: 10 }).map((_, i) => (
            <Skeleton key={i} className="aspect-square rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-16 rounded-xl" />
          ))}
        </div>
      )}
    </div>
  );
}
