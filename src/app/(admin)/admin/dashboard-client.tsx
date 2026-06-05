'use client';

import {useEffect, useMemo, useRef, useState} from 'react';
import {Card, CardContent} from '@/components/ui/card';
import {Button} from '@/components/ui/button';
import {Skeleton} from '@/components/ui/skeleton';
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from '@/components/ui/select';
import {
    ArrowUpRight,
    CalendarDays,
    ChevronLeft,
    ChevronRight,
    Loader2,
    ShoppingBag,
    UserCheck,
    UserPlus,
    Users,
} from 'lucide-react';
import {format} from 'date-fns';
import {ko} from '@/lib/date-locale';
import Link from 'next/link';
import {toast} from 'sonner';
import type {Reservation, Sale} from '@/types/database';
import {RESERVATION_STATUS} from '@/types/database';
import type {DashboardSummary, DashboardTodayData} from '@/lib/actions/dashboard';
import {getDashboardMonthData, getDashboardTodayData,} from '@/lib/actions/dashboard';
import type {
    CategoryStat,
    ChannelStat,
    CustomerStat,
    ExpenseCategoryStat,
    PaymentMethodStat,
} from '@/lib/actions/statistics';
import {formatCurrency, getTodayKST} from '@/lib/utils';
// 랜딩페이지 재사용 예정 — 대시보드에서 일단 제거 (ai-briefing-card.tsx는 보존)
// import {AiBriefingCard} from '@/components/dashboard/ai-briefing-card';
import {KpiCard, KpiGroup} from '@/components/dashboard/kpi-card';
import {SectionHeader} from '@/components/dashboard/section-header';
// [AI 기능 비활성화] 출시 시 AI 브리핑 제거 — 컴포넌트는 보존
// import {AiBriefingLive} from '@/components/ai/ai-briefing-live';

const PAGE_SIZE = 5;

function getMonthOptions() {
  const options = [];
  const now = new Date();
  const startDate = new Date(2024, 11, 1); // 2024년 12월
  const totalMonths =
    (now.getFullYear() - startDate.getFullYear()) * 12 +
    (now.getMonth() - startDate.getMonth()) +
    1;
  for (let i = 0; i < totalMonths; i++) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    options.push({
      value: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`,
      label: format(date, 'yyyy년 M월', { locale: ko }),
    });
  }
  return options;
}

function BarList({
  items,
  emptyMessage,
  barColor = 'bg-brand/60',
}: {
  items: { label: string; amount: number; percentage: number }[];
  emptyMessage: string;
  barColor?: string;
}) {
  if (items.length === 0) {
    return <p className="text-sm text-muted-foreground py-6 text-center">{emptyMessage}</p>;
  }
  return (
    <div className="space-y-3 px-4 sm:px-6 py-1 sm:py-2">
      {items.map((item, i) => (
        <div key={i} className="space-y-1.5">
          <div className="flex items-center justify-between text-sm">
            <span className="text-foreground truncate">{item.label}</span>
            <span className="text-xs text-muted-foreground ml-2 shrink-0">
              {formatCurrency(item.amount)} · {item.percentage}%
            </span>
          </div>
          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
            <div
              className={`h-full ${barColor} rounded-full transition-[width]`}
              style={{ width: `${Math.max(item.percentage, 3)}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

const paymentLabels: Record<string, string> = {
  cash: '현금',
  card: '카드',
  transfer: '계좌이체',
  naverpay: '네이버페이',
};

export function DashboardClient({ initialToday }: { initialToday?: DashboardTodayData }) {
  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const monthOptions = useMemo(() => getMonthOptions(), []);

  // Today data (doesn't change with month selector) — 서버에서 미리 받은 initialToday로 초기화.
  const [todaySummary, setTodaySummary] = useState<DashboardSummary | null>(initialToday?.summary ?? null);
  const [reservations, setReservations] = useState<Reservation[]>(initialToday?.reservations ?? []);
  const [recentSales, setRecentSales] = useState<Sale[]>(initialToday?.recentSales ?? []);
  const [categoryLabels, setCategoryLabels] = useState<Record<string, string>>(
    initialToday ? Object.fromEntries(initialToday.saleCategories.map((c) => [c.value, c.label])) : {},
  );
  const [isTodayLoading, setIsTodayLoading] = useState(!initialToday);

  // Monthly data (changes with month selector)
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [monthSummary, setMonthSummary] = useState<DashboardSummary | null>(null);
  const [monthExpenseTotal, setMonthExpenseTotal] = useState(0);
  const [categoryStats, setCategoryStats] = useState<CategoryStat[]>([]);
  const [paymentStats, setPaymentStats] = useState<PaymentMethodStat[]>([]);
  const [channelStats, setChannelStats] = useState<ChannelStat[]>([]);
  const [customerStats, setCustomerStats] = useState<CustomerStat | null>(null);
  const [expenseStats, setExpenseStats] = useState<ExpenseCategoryStat[]>([]);
  const [isMonthLoading, setIsMonthLoading] = useState(true);
  const [reservationPage, setReservationPage] = useState(0);

  const statusMap = useMemo(() => new Map(RESERVATION_STATUS.map((s) => [s.value, s])), []);

  // 현재 시간 이후 픽업만 필터링
  const upcomingReservations = useMemo(() => {
    const today = getTodayKST();
    const nowKST = new Date(Date.now() + 9 * 60 * 60 * 1000);
    const nowTime = `${String(nowKST.getUTCHours()).padStart(2, '0')}:${String(nowKST.getUTCMinutes()).padStart(2, '0')}`;
    return reservations.filter((r) => {
      if (r.date > today) return true;
      // 오늘: 시간이 현재 이후이거나 시간 미지정
      return !r.time || r.time.slice(0, 5) >= nowTime;
    });
  }, [reservations]);

  const totalReservationPages = Math.ceil(upcomingReservations.length / PAGE_SIZE);
  const pagedReservations = useMemo(
    () => upcomingReservations.slice(reservationPage * PAGE_SIZE, (reservationPage + 1) * PAGE_SIZE),
    [upcomingReservations, reservationPage],
  );

  // Fetch today data (once) - 단일 Server Action (기존 4개 → 1개 HTTP)
  // 서버(page.tsx)에서 initialToday를 받았으면 재조회하지 않는다(첫 페인트 즉시 표시).
  // 마운트 시점의 SSR 데이터 유무를 ref로 한 번만 확정(객체 의존성으로 인한 재실행 방지).
  const hasInitialToday = useRef(!!initialToday);
  useEffect(() => {
    if (hasInitialToday.current) return;
    async function fetchTodayData() {
      setIsTodayLoading(true);
      try {
        const data = await getDashboardTodayData();
        setTodaySummary(data.summary);
        setReservations(data.reservations);
        setRecentSales(data.recentSales);
        setCategoryLabels(Object.fromEntries(data.saleCategories.map((c) => [c.value, c.label])));
      } catch (error) {
        console.error('Failed to fetch today data:', error);
        toast.error('오늘 데이터를 불러오지 못했습니다. 잠시 후 다시 시도해주세요.');
      } finally {
        setIsTodayLoading(false);
      }
    }
    fetchTodayData();
  }, []);

  // Fetch monthly data (when month changes) - 단일 Server Action (기존 7개 → 1개 HTTP)
  useEffect(() => {
    async function fetchMonthData() {
      setIsMonthLoading(true);
      try {
        const data = await getDashboardMonthData(selectedMonth);
        setMonthSummary(data.summary);
        setMonthExpenseTotal(data.expenseTotal);
        setCategoryStats(data.categoryStats);
        setPaymentStats(data.paymentStats);
        setChannelStats(data.channelStats);
        setCustomerStats(data.customerStats);
        setExpenseStats(data.expenseStats);
      } catch (error) {
        console.error('Failed to fetch month data:', error);
        toast.error('월간 데이터를 불러오지 못했습니다. 잠시 후 다시 시도해주세요.');
      } finally {
        setIsMonthLoading(false);
      }
    }
    fetchMonthData();
  }, [selectedMonth]);

  const totalSales = monthSummary?.totalAmount || 0;
  const netProfit = totalSales - monthExpenseTotal;

  return (
    <div className="space-y-6 px-4 sm:px-6 py-1 sm:py-2">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="font-sans text-xl font-semibold text-foreground tracking-tight">대시보드</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {format(now, 'yyyy년 M월 d일 (EEEE)', { locale: ko })}
          </p>
        </div>
        <Select value={selectedMonth} onValueChange={setSelectedMonth}>
          <SelectTrigger className="w-[150px] bg-background">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {monthOptions.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* [AI 기능 비활성화] flori AI 오늘의 브리핑 (선제 제안 + 질문)
      <AiBriefingLive /> */}

      {/* Summary Cards */}
      {isTodayLoading || isMonthLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 overflow-hidden rounded-xl border border-border bg-card">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="p-5 space-y-3 border-border [&:not(:last-child)]:border-r [&:nth-child(-n+2)]:border-b md:[&:nth-child(-n+2)]:border-b-0"
            >
              <Skeleton className="h-3 w-14" />
              <Skeleton className="h-8 w-24" />
            </div>
          ))}
        </div>
      ) : (
        <KpiGroup>
          <KpiCard label="오늘 매출" value={formatCurrency(todaySummary?.totalAmount || 0)} />
          <KpiCard
            label={`${monthOptions.find((o) => o.value === selectedMonth)?.label || '이번 달'} 매출`}
            value={formatCurrency(totalSales)}
          />
          <KpiCard
            label={`${monthOptions.find((o) => o.value === selectedMonth)?.label || '이번 달'} 지출`}
            value={formatCurrency(monthExpenseTotal)}
          />
          <KpiCard
            label="순이익"
            value={formatCurrency(netProfit)}
            valueClassName={netProfit >= 0 ? '' : 'text-danger'}
          />
        </KpiGroup>
      )}

      {/* flori AI 브리핑(프리미엄 teaser) — 대시보드에서 일단 제거.
          컴포넌트(ai-briefing-card.tsx)는 보존, 랜딩페이지 만들 때 재사용 예정.
          <AiBriefingCard /> */}

      {/* Two Column: Reservations + Recent Sales */}
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
                  캘린더 <ArrowUpRight className="w-3 h-3" />
                </Link>
              }
            />
          </CardContent>
          <CardContent className="p-4 pt-2">
            {isTodayLoading ? (
              <div className="space-y-2 py-1">
                {[...Array(5)].map((_, i) => (
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
                          <span className="text-[10px] text-muted-foreground tabular-nums block">
                            {r.time ? r.time.slice(0, 5) : '--:--'}
                          </span>
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

        {/* Recent Sales */}
        <Card className="overflow-hidden">
          <CardContent className="p-4 pb-2">
            <SectionHeader
              title={
                <span className="inline-flex items-center gap-2">
                  <ArrowUpRight className="h-4 w-4 text-brand" aria-hidden="true" />
                  최근 매출
                </span>
              }
              action={
                <Link
                  href="/admin/sales"
                  className="text-xs text-muted-foreground hover:text-brand flex items-center gap-1 transition-colors"
                >
                  더보기 <ArrowUpRight className="w-3 h-3" />
                </Link>
              }
            />
          </CardContent>
          <CardContent className="p-4 pt-2">
            {isTodayLoading ? (
              <div>
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="flex items-center justify-between py-1.5 border-b border-border last:border-0">
                    <div className="flex items-center gap-3">
                      <Skeleton className="h-3 w-8" />
                      <Skeleton className="h-5 w-14 rounded" />
                      <Skeleton className="h-3.5 w-20" />
                    </div>
                    <Skeleton className="h-4 w-16" />
                  </div>
                ))}
              </div>
            ) : recentSales.length > 0 ? (
              <div>
                {recentSales.map((sale) => (
                  <div
                    key={sale.id}
                    className="flex items-center justify-between py-1.5 border-b border-border last:border-0"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-muted-foreground w-16 tabular-nums shrink-0">
                        {format(new Date(sale.date), 'yy/MM/dd')}
                      </span>
                      <div className="min-w-0 leading-tight">
                        <p className="text-sm font-medium text-foreground truncate">
                          {sale.category_label ?? '미분류'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {sale.is_unpaid ? '미수' : (sale.payment_method_label ?? '')}
                          {sale.customer_name ? ` · ${sale.customer_name}` : (sale.channel_label ? ` · ${sale.channel_label}` : '')}
                        </p>
                      </div>
                    </div>
                    <span className="text-sm font-semibold text-foreground tabular-nums ml-2 shrink-0">
                      {formatCurrency(sale.amount)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <p className="text-sm">등록된 매출이 없습니다</p>
                <Link
                  href="/admin/sales"
                  className="text-brand hover:text-brand/80 text-sm mt-2 inline-block transition-colors"
                >
                  첫 매출 등록하기
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Monthly Analysis Section */}
      <div>
        <div className="mb-4">
          <SectionHeader
            title={`${monthOptions.find((o) => o.value === selectedMonth)?.label || '이번 달'} 분석`}
            meta="월간 인사이트"
            action={
              isMonthLoading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" aria-label="로딩 중" />
              ) : undefined
            }
          />
          <p className="text-xs text-muted-foreground mt-2">어떤 상품이 잘 팔렸는지, 어떤 결제방식이 많았는지 한눈에 볼 수 있어요</p>
        </div>

        {/* Customer + Summary row */}
        {!isMonthLoading && customerStats && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
                    <Users className="h-3.5 w-3.5 text-muted-foreground" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground">구매 고객</p>
                    <p className="text-base font-bold text-foreground tabular-nums">{customerStats.totalCustomers}명</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
                    <UserPlus className="h-3.5 w-3.5 text-muted-foreground" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground">첫 방문</p>
                    <p className="text-base font-bold text-foreground tabular-nums">{customerStats.newCustomers}명</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
                    <UserCheck className="h-3.5 w-3.5 text-muted-foreground" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground">다시 온 고객</p>
                    <p className="text-base font-bold text-foreground tabular-nums">{customerStats.returningCustomers}명</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Analysis Cards */}
        {isMonthLoading ? (
          <div className="grid lg:grid-cols-2 gap-4">
            {[...Array(2)].map((_, i) => (
              <Card key={i}>
                <CardContent className="p-4 space-y-4">
                  <div className="space-y-1">
                    <Skeleton className="h-4 w-28" />
                    <Skeleton className="h-3 w-48" />
                  </div>
                  {[...Array(4)].map((_, j) => (
                    <div key={j} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Skeleton className="h-3 w-3 rounded-full" />
                        <Skeleton className="h-3 w-20" />
                      </div>
                      <Skeleton className="h-3 w-16" />
                    </div>
                  ))}
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="grid lg:grid-cols-2 gap-4">
            <Card>
              <CardContent className="p-4">
                <h3 className="text-sm font-medium text-foreground mb-1 flex items-center gap-2">
                  <ShoppingBag className="h-3.5 w-3.5 text-brand" />
                  카테고리별 매출
                </h3>
                <p className="text-[11px] text-muted-foreground mb-4">어떤 상품이 가장 많이 팔렸는지 보여줘요</p>
                <BarList
                  items={categoryStats.map((c) => ({
                    label: c.label,
                    amount: c.amount,
                    percentage: c.percentage,
                  }))}
                  emptyMessage="매출 데이터가 없습니다"
                />
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <h3 className="text-sm font-medium text-foreground mb-1 flex items-center gap-2">
                  <ShoppingBag className="h-3.5 w-3.5 text-brand" />
                  결제방식별 매출
                </h3>
                <p className="text-[11px] text-muted-foreground mb-4">카드, 현금, 이체 등 결제수단별 비율이에요</p>
                <BarList
                  items={paymentStats.map((p) => ({
                    label: p.label,
                    amount: p.amount,
                    percentage: p.percentage,
                  }))}
                  emptyMessage="매출 데이터가 없습니다"
                  barColor="bg-foreground/20"
                />
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <h3 className="text-sm font-medium text-foreground mb-1 flex items-center gap-2">
                  <ShoppingBag className="h-3.5 w-3.5 text-brand" />
                  예약채널별 매출
                </h3>
                <p className="text-[11px] text-muted-foreground mb-4">전화, 카카오톡, 네이버 등 주문 경로별 비율이에요</p>
                <BarList
                  items={channelStats.map((c) => ({
                    label: c.label,
                    amount: c.amount,
                    percentage: c.percentage,
                  }))}
                  emptyMessage="매출 데이터가 없습니다"
                  barColor="bg-brand/40"
                />
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <h3 className="text-sm font-medium text-foreground mb-1 flex items-center gap-2">
                  <ShoppingBag className="h-3.5 w-3.5 text-brand" />
                  지출 카테고리
                </h3>
                <p className="text-[11px] text-muted-foreground mb-4">꽃 구매, 배달비, 임대료 등 어디에 돈을 쓰고 있는지 보여줘요</p>
                <BarList
                  items={expenseStats.map((e) => ({
                    label: e.label,
                    amount: e.amount,
                    percentage: e.percentage,
                  }))}
                  emptyMessage="지출 데이터가 없습니다"
                  barColor="bg-danger/30"
                />
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
