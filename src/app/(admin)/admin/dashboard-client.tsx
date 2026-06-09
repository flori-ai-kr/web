'use client';

import {useEffect, useMemo, useRef, useState} from 'react';
import {Card, CardContent} from '@/components/ui/card';
import {Button} from '@/components/ui/button';
import {Skeleton} from '@/components/ui/skeleton';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    ArrowUpRight,
    CalendarDays,
    ChevronLeft,
    ChevronRight,
    MessageSquare,
    Plus,
    ReceiptText,
    TrendingUp,
    Wallet,
} from 'lucide-react';
import {format, formatDistanceToNow} from 'date-fns';
import {ko} from '@/lib/date-locale';
import Link from 'next/link';
import {toast} from 'sonner';
import {useRouter} from 'next/navigation';
import type {Reservation} from '@/types/database';
import {RESERVATION_STATUS} from '@/types/database';
import type {DashboardMonthData, DashboardSummary, DashboardTodayData} from '@/lib/actions/dashboard';
import {getDashboardTodayData} from '@/lib/actions/dashboard';
import type {LatestCommunityPost} from '@/lib/actions/community';
import {formatCurrency, formatManwon, getTodayKST} from '@/lib/utils';
import {SectionHeader} from '@/components/dashboard/section-header';
import {AiBriefingCard} from '@/components/dashboard/ai-briefing-card';
import {CommunityCategoryBadge} from '@/components/community/category-badge';

const PAGE_SIZE = 5;

interface Props {
  greeting: string;
  initialToday?: DashboardTodayData;
  initialMonth?: DashboardMonthData;
  initialCommunityPosts: LatestCommunityPost[];
}

export function DashboardClient({greeting, initialToday, initialMonth, initialCommunityPosts}: Props) {
  const now = new Date();
  const router = useRouter();

  // Today data
  const [todaySummary, setTodaySummary] = useState<DashboardSummary | null>(initialToday?.summary ?? null);
  const [reservations, setReservations] = useState<Reservation[]>(initialToday?.reservations ?? []);
  const [isTodayLoading, setIsTodayLoading] = useState(!initialToday);
  const [reservationPage, setReservationPage] = useState(0);

  // Month data (from SSR)
  const monthSummary = initialMonth?.summary ?? null;
  const monthExpenseTotal = initialMonth?.expenseTotal ?? 0;

  // Community posts (from SSR)
  const communityPosts = initialCommunityPosts;

  const statusMap = useMemo(() => new Map(RESERVATION_STATUS.map((s) => [s.value, s])), []);

  // 현재 시간 이후 픽업만 필터링
  const upcomingReservations = useMemo(() => {
    const today = getTodayKST();
    const nowKST = new Date(Date.now() + 9 * 60 * 60 * 1000);
    const nowTime = `${String(nowKST.getUTCHours()).padStart(2, '0')}:${String(nowKST.getUTCMinutes()).padStart(2, '0')}`;
    return reservations.filter((r) => {
      if (r.date > today) return true;
      return !r.time || r.time.slice(0, 5) >= nowTime;
    });
  }, [reservations]);

  const totalReservationPages = Math.ceil(upcomingReservations.length / PAGE_SIZE);
  const pagedReservations = useMemo(
    () => upcomingReservations.slice(reservationPage * PAGE_SIZE, (reservationPage + 1) * PAGE_SIZE),
    [upcomingReservations, reservationPage],
  );

  // Fetch today data (once) — 서버(page.tsx)에서 initialToday를 받았으면 재조회하지 않는다.
  const hasInitialToday = useRef(!!initialToday);
  useEffect(() => {
    if (hasInitialToday.current) return;
    async function fetchTodayData() {
      setIsTodayLoading(true);
      try {
        const data = await getDashboardTodayData();
        setTodaySummary(data.summary);
        setReservations(data.reservations);
      } catch (error) {
        console.error('Failed to fetch today data:', error);
        toast.error('오늘 데이터를 불러오지 못했습니다. 잠시 후 다시 시도해주세요.');
      } finally {
        setIsTodayLoading(false);
      }
    }
    fetchTodayData();
  }, []);

  const totalSales = monthSummary?.totalAmount ?? 0;
  const netProfit = totalSales - monthExpenseTotal;
  const expenseRatio = totalSales > 0 ? Math.round((monthExpenseTotal / totalSales) * 100) : 0;

  return (
    <div className="space-y-6 px-4 sm:px-6 py-1 sm:py-2">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="min-w-0">
          <h1 className="font-sans text-base sm:text-lg font-medium text-foreground/80 tracking-tight">
            {greeting}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {format(now, 'yyyy년 M월 d일 (EEEE)', {locale: ko})}
          </p>
        </div>

        {/* 빠른 등록 dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="default"
              className="gap-2 bg-brand hover:bg-brand/90 text-white shadow-sm"
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              빠른 등록
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <DropdownMenuItem
              className="gap-3 cursor-pointer"
              onSelect={() => router.push('/admin/sales?new=1')}
            >
              <ReceiptText className="h-4 w-4 text-brand shrink-0" aria-hidden="true" />
              <div>
                <div className="font-medium text-sm">매출 등록</div>
                <div className="text-xs text-muted-foreground">오늘 날짜로 바로 입력</div>
              </div>
            </DropdownMenuItem>
            <DropdownMenuItem
              className="gap-3 cursor-pointer"
              onSelect={() => router.push('/admin/expenses?new=1')}
            >
              <Wallet className="h-4 w-4 text-brand shrink-0" aria-hidden="true" />
              <div>
                <div className="font-medium text-sm">지출 등록</div>
                <div className="text-xs text-muted-foreground">오늘 날짜로 바로 입력</div>
              </div>
            </DropdownMenuItem>
            <DropdownMenuItem
              className="gap-3 cursor-pointer"
              onSelect={() => router.push('/admin/calendar?new=1')}
            >
              <CalendarDays className="h-4 w-4 text-brand shrink-0" aria-hidden="true" />
              <div>
                <div className="font-medium text-sm">예약 등록</div>
                <div className="text-xs text-muted-foreground">오늘 날짜로 바로 입력</div>
              </div>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* flori AI 오늘의 브리핑 (개발 중 — 잠금 미리보기) */}
      <AiBriefingCard />

      {/* Two Column: Reservations + (오늘 매출 + 이번 달 요약) */}
      <div className="grid lg:grid-cols-2 gap-4 items-start">
        {/* Upcoming Reservations */}
        <Card className="overflow-hidden">
          <CardContent className="p-4 pb-2">
            <SectionHeader
              title={
                <span className="inline-flex items-center gap-2">
                  <CalendarDays className="h-4 w-4 text-brand" aria-hidden="true" />
                  다가오는 예약
                </span>
              }
              meta={upcomingReservations.length > 0 ? `${upcomingReservations.length}건` : undefined}
              action={
                <Link
                  href="/admin/calendar"
                  className="text-xs text-muted-foreground hover:text-brand flex items-center gap-1 transition-colors"
                >
                  캘린더 보기 <ArrowUpRight className="w-3 h-3" />
                </Link>
              }
            />
          </CardContent>
          <CardContent className="p-4 pt-2">
            {isTodayLoading ? (
              <div className="space-y-2 py-1">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                    <Skeleton className="h-4 w-11 shrink-0" />
                    <div className="flex-1 space-y-1.5">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-3 w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            ) : upcomingReservations.length > 0 ? (
              <>
                <div className="space-y-2">
                  {pagedReservations.map((r) => {
                    const status = statusMap.get(r.status);
                    const today = getTodayKST();
                    const isToday = r.date === today;
                    return (
                      <div key={r.id} className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                        <div className="pt-0.5 shrink-0 text-right">
                          <span className="text-xs font-medium text-muted-foreground tabular-nums block">
                            {isToday ? '오늘' : r.date.slice(5).replace('-', '/')}
                          </span>
                          {r.time && (
                            <span className="text-[10px] text-muted-foreground tabular-nums block">
                              {r.time.slice(0, 5)}
                            </span>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-foreground truncate">
                              {r.title}
                            </span>
                            {status && (
                              <span
                                className="text-[10px] px-1.5 py-0.5 rounded font-medium shrink-0"
                                style={{
                                  backgroundColor: `${status.color}20`,
                                  color: status.color,
                                }}
                              >
                                {status.label}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {r.customer_name}
                            {r.amount > 0 && ` · ${formatCurrency(r.amount)}`}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
                {totalReservationPages > 1 && (
                  <div className="flex items-center justify-center gap-2 mt-3 pt-3 border-t border-border">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      disabled={reservationPage === 0}
                      onClick={() => setReservationPage((p) => p - 1)}
                      aria-label="이전 페이지"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-xs text-muted-foreground tabular-nums">
                      {reservationPage + 1} / {totalReservationPages}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      disabled={reservationPage >= totalReservationPages - 1}
                      onClick={() => setReservationPage((p) => p + 1)}
                      aria-label="다음 페이지"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <CalendarDays className="h-8 w-8 mx-auto mb-2 opacity-40" />
                <p className="text-sm">다가오는 예약이 없습니다</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 오늘 매출 + 이번 달 요약 (합친 카드) */}
        <Card className="overflow-hidden">
          {/* 오늘 매출 */}
          <CardContent className="p-4 pb-3 border-b border-border">
            {isTodayLoading ? (
              <div className="flex items-center justify-between gap-4">
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-3 w-14" />
                  <Skeleton className="h-7 w-32" />
                </div>
                <Skeleton className="w-1 h-10 rounded-full" />
              </div>
            ) : (
              <div className="flex items-center justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">오늘 매출</p>
                  <p className="text-xl sm:text-2xl font-bold tracking-tight text-foreground mt-1 tabular-nums">
                    {formatCurrency(todaySummary?.totalAmount ?? 0)}
                  </p>
                  {!todaySummary?.totalAmount && (
                    <p className="text-xs text-muted-foreground mt-1">오늘 등록된 매출이 없습니다</p>
                  )}
                </div>
                <div
                  className="w-1 self-stretch rounded-full shrink-0"
                  style={{background: 'linear-gradient(to bottom, var(--brand), color-mix(in srgb, var(--brand) 50%, white))'}}
                  aria-hidden="true"
                />
              </div>
            )}
          </CardContent>
          {/* 이번 달 요약 */}
          <CardContent className="p-4 pb-2">
            <SectionHeader
              title={
                <span className="inline-flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-brand" aria-hidden="true" />
                  이번 달 요약
                </span>
              }
              meta={format(now, 'M월', {locale: ko})}
              action={
                <Link
                  href="/admin/statistics"
                  className="text-xs text-muted-foreground hover:text-brand flex items-center gap-1 transition-colors"
                >
                  통계 보기 <ArrowUpRight className="w-3 h-3" />
                </Link>
              }
            />
          </CardContent>
          <CardContent className="p-4 pt-2">
            {!initialMonth ? (
              <div className="space-y-4 py-1">
                <Skeleton className="h-8 w-28" />
                <Skeleton className="h-2 w-full rounded-full" />
                <div className="grid grid-cols-2 gap-3">
                  <Skeleton className="h-14 rounded-lg" />
                  <Skeleton className="h-14 rounded-lg" />
                </div>
              </div>
            ) : (
              <div className="space-y-3.5">
                {/* 순이익 — 헤드라인 */}
                <div className="flex items-end justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-muted-foreground">순이익</p>
                    <p
                      className={`text-2xl font-bold tabular-nums mt-0.5 ${netProfit >= 0 ? 'text-foreground' : 'text-danger'}`}
                    >
                      {netProfit >= 0 ? '' : '-'}{formatManwon(Math.abs(netProfit))}
                    </p>
                  </div>
                  {totalSales > 0 && (
                    <span className="text-xs text-muted-foreground shrink-0 pb-1">
                      매출의 {expenseRatio}% 지출
                    </span>
                  )}
                </div>

                {/* 지출/매출 비율 바 */}
                <div
                  className="h-2 rounded-full bg-muted overflow-hidden"
                  role="img"
                  aria-label={`매출 대비 지출 비율 ${expenseRatio}%`}
                >
                  <div
                    className={`h-full rounded-full ${netProfit >= 0 ? 'bg-brand' : 'bg-danger'}`}
                    style={{width: `${Math.min(expenseRatio, 100)}%`}}
                  />
                </div>

                {/* 매출 · 지출 타일 */}
                <div className="grid grid-cols-2 gap-3 pt-0.5">
                  <div className="rounded-lg bg-muted/40 px-3 py-2.5">
                    <p className="text-xs text-muted-foreground">매출</p>
                    <p className="text-base font-bold text-foreground tabular-nums mt-0.5">
                      {formatManwon(totalSales)}
                    </p>
                  </div>
                  <div className="rounded-lg bg-muted/40 px-3 py-2.5">
                    <p className="text-xs text-muted-foreground">지출</p>
                    <p className="text-base font-bold text-foreground tabular-nums mt-0.5">
                      {formatManwon(monthExpenseTotal)}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 커뮤니티 최신글 */}
      <Card className="overflow-hidden">
        <CardContent className="p-4 pb-2">
          <SectionHeader
            title={
              <span className="inline-flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-brand" aria-hidden="true" />
                커뮤니티 최신글
              </span>
            }
            action={
              <Link
                href="/admin/community"
                className="text-xs text-muted-foreground hover:text-brand flex items-center gap-1 transition-colors"
              >
                커뮤니티 가기 <ArrowUpRight className="w-3 h-3" />
              </Link>
            }
          />
        </CardContent>
        <CardContent className="p-4 pt-2">
          {communityPosts.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground">
              <MessageSquare className="h-7 w-7 mx-auto mb-2 opacity-40" />
              <p className="text-sm">커뮤니티에서 다른 사장님들과 소통해보세요</p>
              <Link
                href="/admin/community"
                className="inline-flex items-center gap-1 mt-2 text-xs text-brand hover:underline"
              >
                커뮤니티 가기 <ArrowUpRight className="w-3 h-3" />
              </Link>
            </div>
          ) : (
            <div>
              {communityPosts.map((post) => (
                <Link
                  key={post.id}
                  href={`/admin/community/${post.id}`}
                  className="flex items-center gap-3 py-3 border-b border-border last:border-0 hover:bg-muted/30 -mx-1 px-1 rounded-sm group"
                >
                  <CommunityCategoryBadge category={post.category} className="shrink-0" />
                  <span className="flex-1 min-w-0 text-sm font-medium text-foreground truncate group-hover:text-brand">
                    {post.title}
                  </span>
                  <span className="text-xs text-muted-foreground shrink-0">
                    {formatDistanceToNow(new Date(post.createdAt), {addSuffix: true, locale: ko})}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

    </div>
  );
}
