import { Skeleton } from '@/components/ui/skeleton';

// 콘솔 그룹 공통 로딩 폴백. 서버 페치(통계/유저/구독 등) 중 셸이 유지되도록 한다.
export default function ConsoleLoading() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-7 w-48" />
        <Skeleton className="h-4 w-72" />
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-64 rounded-xl" />
    </div>
  );
}
