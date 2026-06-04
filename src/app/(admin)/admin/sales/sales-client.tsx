'use client';

import {useCallback, useEffect, useMemo, useOptimistic, useRef, useState, useTransition} from 'react';
import {useRouter, useSearchParams} from 'next/navigation';
import {Button} from '@/components/ui/button';
import {PageHeader} from '@/components/layout/PageHeader';
import {Input} from '@/components/ui/input';
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from '@/components/ui/select';
import {Dialog, DialogContent, DialogHeader, DialogTitle} from '@/components/ui/dialog';
import {CalendarCheck, Plus, RotateCcw, Search, Settings} from 'lucide-react';
import {format} from 'date-fns';
import {ko} from '@/lib/date-locale';
import {toast} from 'sonner';
import type {SalesFilters} from '@/lib/actions/sales';
import {deleteSale, loadMoreSales} from '@/lib/actions/sales';
import {getReservationsForSale} from '@/lib/actions/reservations';
import {getPhotoCardBySaleId} from '@/lib/actions/photo-cards';
import dynamic from 'next/dynamic';
import {SalesSettingsModal} from '@/components/sales/SalesSettingsModal';
import type {SalesSummary as SalesSummaryType} from '@/lib/utils';
import {formatCurrency} from '@/lib/utils';
import type {PhotoCard, Reservation, Sale} from '@/types/database';
import {getPaymentMethods, getSaleCategories, PaymentMethod, SaleCategory} from '@/lib/actions/sale-settings';
import {ExportButton} from '@/components/ui/export-button';
import {CategoryMultiSelect} from '@/components/ui/category-multi-select';
import type {ExportConfig} from '@/lib/export';
import {CHANNEL_LABELS, TODAY_FILTER_ACTIVE_CLASS} from '@/lib/constants';
import {SalesSummary} from './components/SalesSummary';
import {SalesList} from './components/SalesList';
import {SaleFormDialog} from './components/SaleFormDialog';
import {SaleDetailDialog} from './components/SaleDetailDialog';

const SalePhotoModal = dynamic(
  () => import('@/components/sales/SalePhotoModal').then(mod => ({ default: mod.SalePhotoModal })),
  { loading: () => null, ssr: false },
);

// Year options: 2024 ~ 2030
const YEAR_OPTIONS = Array.from({ length: 7 }, (_, i) => 2024 + i);
// Month options: 1 ~ 12
const MONTH_OPTIONS = Array.from({ length: 12 }, (_, i) => i + 1);
// Day options: 1 ~ 31
const DAY_OPTIONS = Array.from({ length: 31 }, (_, i) => i + 1);

interface Props {
  initialSales: Sale[];
  initialHasMore: boolean;
  initialSummary: SalesSummaryType;
  monthParam: string | null;
  currentYear: number;
  currentMonth: number;
  currentDay: number;
  initialFilters: SalesFilters;
  initialCategories: SaleCategory[];
  initialPayments: PaymentMethod[];
  initialSelectedSale?: Sale | null;
}

export function SalesClient({ initialSales, initialHasMore, initialSummary, monthParam: serverMonthParam, currentYear, currentMonth, currentDay, initialFilters, initialCategories, initialPayments, initialSelectedSale }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedSale, setSelectedSale] = useState<Sale | null>(initialSelectedSale || null);
  const [editingSale, setEditingSale] = useState<Sale | null>(null);
  // 필터는 URL 파라미터 기반 (서버 쿼리에 적용됨)
  const paymentFilter: string[] = initialFilters.payment ?? [];
  const categoryFilter: string[] = initialFilters.category ?? [];
  const channelFilter: string[] = initialFilters.channel ?? [];
  const [searchQuery, setSearchQuery] = useState('');
  const [photoModalSale, setPhotoModalSale] = useState<Sale | null>(null);
  const [showPhotoPrompt, setShowPhotoPrompt] = useState<Sale | null>(null);
  const [selectedSalePhotos, setSelectedSalePhotos] = useState<PhotoCard | null>(null);
  const [selectedSaleReservations, setSelectedSaleReservations] = useState<Reservation[]>([]);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [categories, setCategories] = useState<SaleCategory[]>(initialCategories);
  const [payments, setPayments] = useState<PaymentMethod[]>(initialPayments);
  const [deleteTarget, setDeleteTarget] = useState<Sale | null>(null);
  const [, startDeleteTransition] = useTransition();
  const [initialCustomer, setInitialCustomer] = useState<{ name: string; id: string | null; phone: string | null } | undefined>();

  // 무한스크롤 상태
  const [allSales, setAllSales] = useState<Sale[]>(initialSales);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const dataVersionRef = useRef(0);

  // 낙관적 삭제: 즉시 목록에서 제거하고, 서버 실패 시 자동 롤백된다.
  const [optimisticSales, removeOptimisticSale] = useOptimistic(
    allSales,
    (sales, deletedId: string) => sales.filter((s) => s.id !== deletedId),
  );

  // initialSales가 변경되면(년/월/필터 변경) 리셋
  useEffect(() => {
    dataVersionRef.current += 1;
    setAllSales(initialSales);
    setHasMore(initialHasMore);
    setIsLoadingMore(false);
  }, [initialSales, initialHasMore]);

  // URL saleId로 직접 열린 경우 photos/reservations 로드
  useEffect(() => {
    if (initialSelectedSale) {
      Promise.all([
        getPhotoCardBySaleId(initialSelectedSale.id),
        getReservationsForSale(initialSelectedSale.id),
      ]).then(([photoCard, reservations]) => {
        setSelectedSalePhotos(photoCard);
        setSelectedSaleReservations(reservations);
      });
    }
  }, [initialSelectedSale]);

  // 카테고리/결제방식 라벨 및 색상 맵 생성 (value -> label/color)
  const categoryLabels = useMemo(() =>
    Object.fromEntries(categories.map(c => [c.value, c.label])), [categories]);
  const categoryColors = useMemo(() =>
    Object.fromEntries(categories.map(c => [c.value, c.color])), [categories]);
  const paymentLabels = useMemo(() =>
    Object.fromEntries(payments.map(p => [p.value, p.label])), [payments]);
  const paymentColors = useMemo(() =>
    Object.fromEntries(payments.map(p => [p.value, p.color])), [payments]);

  // 설정 새로고침
  const refreshSettings = async () => {
    const [cats, pays] = await Promise.all([getSaleCategories(), getPaymentMethods()]);
    setCategories(cats);
    setPayments(pays);
  };

  // URL 파라미터로 등록 모달 자동 오픈 (고객 페이지에서 연결)
  useEffect(() => {
    const action = searchParams.get('action');
    if (action === 'create') {
      const paramCustomerName = searchParams.get('customer_name');
      const paramCustomerPhone = searchParams.get('customer_phone');
      const paramCustomerId = searchParams.get('customer_id');

      if (paramCustomerName) {
        setInitialCustomer({
          name: paramCustomerName,
          id: paramCustomerId,
          phone: paramCustomerPhone,
        });
      }

      setIsFormOpen(true);
      // URL 파라미터 정리
      const cleanParams = new URLSearchParams();
      cleanParams.set('year', currentYear === 0 ? 'all' : currentYear.toString());
      cleanParams.set('month', currentMonth === 0 ? 'all' : currentMonth.toString());
      if (currentDay !== 0) cleanParams.set('day', currentDay.toString());
      router.replace(`/admin/sales?${cleanParams.toString()}`, { scroll: false });
    }
  }, [searchParams, router, currentYear, currentMonth, currentDay]);

  // 검색어 디바운스 → 서버사이드 검색
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const searchVersionRef = useRef(0);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const filtersKey = `${(initialFilters.category ?? []).join(',')}-${(initialFilters.payment ?? []).join(',')}-${(initialFilters.channel ?? []).join(',')}`;

  useEffect(() => {
    if (debouncedSearch === '') {
      // 검색어가 비어지면 초기 데이터로 복원
      setIsSearching(false);
      dataVersionRef.current += 1;
      setAllSales(initialSales);
      setHasMore(initialHasMore);
      return;
    }
    const version = ++searchVersionRef.current;
    setIsSearching(true);
    loadMoreSales(serverMonthParam, 0, { ...initialFilters, search: debouncedSearch })
      .then(result => {
        if (version !== searchVersionRef.current) return;
        dataVersionRef.current += 1;
        setAllSales(result.sales);
        setHasMore(result.hasMore);
      })
      .catch(() => {
        toast.error('검색에 실패했습니다');
      })
      .finally(() => {
        if (version === searchVersionRef.current) setIsSearching(false);
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch, serverMonthParam, filtersKey, initialSales, initialHasMore]);

  const filteredSales = allSales;

  // 서버에서 필터 적용된 요약 (페이지네이션 무관)
  const summary = initialSummary;

  const hasActiveFilters = paymentFilter.length > 0 || categoryFilter.length > 0 || channelFilter.length > 0 || searchQuery !== '';

  const yearLabel = currentYear === 0 ? '전체' : `${currentYear}년`;
  const monthLabel = currentMonth === 0 ? '전체' : `${currentMonth}월`;
  const dayLabel = currentDay === 0 ? '' : ` ${currentDay}일`;

  const getExportConfig = useCallback((): ExportConfig<Sale> => {
    const isAll = currentYear === 0 || currentMonth === 0;
    const monthSuffix = isAll ? '' : `_${currentYear}-${String(currentMonth).padStart(2, '0')}`;
    const daySuffix = currentDay === 0 ? '' : `-${String(currentDay).padStart(2, '0')}`;
    return ({
    filename: isAll ? '매출_전체' : `매출${monthSuffix}${daySuffix}`,
    title: `매출 내역 (${yearLabel} ${monthLabel}${dayLabel})`,
    columns: [
      { header: '날짜', accessor: (s) => String(s.date || '') },
      { header: '카테고리', accessor: (s) => categoryLabels[s.product_category] || s.product_category || '' },
      { header: '금액', accessor: (s) => Number(s.amount) || 0, format: 'currency' },
      { header: '결제방법', accessor: (s) => paymentLabels[s.payment_method] || s.payment_method || '' },
      { header: '채널', accessor: (s) => CHANNEL_LABELS[s.reservation_channel] || '' },
      { header: '고객명', accessor: (s) => String(s.customer_name || '') },
      { header: '비고', accessor: (s) => String(s.note || '') },
    ],
    data: filteredSales,
    });
  }, [filteredSales, currentYear, currentMonth, currentDay, yearLabel, monthLabel, dayLabel, categoryLabels, paymentLabels]);

  // 매출 상세 선택 시 사진 + 연결 예약 로드
  const handleSelectSale = async (sale: Sale) => {
    setSelectedSale(sale);
    setSelectedSalePhotos(null);
    setSelectedSaleReservations([]);
    const [photoCard, reservations] = await Promise.all([
      getPhotoCardBySaleId(sale.id),
      getReservationsForSale(sale.id),
    ]);
    setSelectedSalePhotos(photoCard);
    setSelectedSaleReservations(reservations);
  };

  const yearParam = currentYear === 0 ? 'all' : currentYear.toString();
  const monthParam = currentMonth === 0 ? 'all' : currentMonth.toString();
  const dayParam = currentDay === 0 ? 'all' : currentDay.toString();
  const isDayDisabled = yearParam === 'all' || monthParam === 'all';

  // URL 빌드 헬퍼: 'all' 값이면 파라미터 생략. category/payment/channel은 쉼표 구분 다중값
  const buildUrl = useCallback((overrides: {
    year?: string; month?: string; day?: string;
    category?: string[]; payment?: string[]; channel?: string[];
  } = {}) => {
    const p = {
      year: yearParam,
      month: monthParam,
      day: dayParam,
      category: categoryFilter,
      payment: paymentFilter,
      channel: channelFilter,
      ...overrides,
    };
    // 년/월이 'all'이면 일은 자동 'all'
    if (p.year === 'all' || p.month === 'all') p.day = 'all';
    const params = new URLSearchParams();
    params.set('year', p.year);
    params.set('month', p.month);
    if (p.day !== 'all') params.set('day', p.day);
    if (p.category.length > 0) params.set('category', p.category.join(','));
    if (p.payment.length > 0) params.set('payment', p.payment.join(','));
    if (p.channel.length > 0) params.set('channel', p.channel.join(','));
    return `/admin/sales?${params.toString()}`;
  }, [yearParam, monthParam, dayParam, categoryFilter, paymentFilter, channelFilter]);

  const handleYearChange = (year: string) => {
    router.push(buildUrl({ year, day: 'all' }));
  };

  const handleMonthChange = (month: string) => {
    router.push(buildUrl({ month, day: 'all' }));
  };

  const handleDayChange = (day: string) => {
    router.push(buildUrl({ day }));
  };

  const handleTodayOnly = () => {
    const now = new Date();
    const y = now.getFullYear().toString();
    const m = (now.getMonth() + 1).toString();
    const d = now.getDate().toString();
    router.push(buildUrl({ year: y, month: m, day: d }));
  };

  const handleCategoryChange = (category: string[]) => {
    router.push(buildUrl({ category }));
  };

  const handlePaymentChange = (payment: string[]) => {
    router.push(buildUrl({ payment }));
  };

  const handleChannelChange = (channel: string[]) => {
    router.push(buildUrl({ channel }));
  };

  const handleOpenPhotoModal = async (sale: Sale) => {
    setPhotoModalSale(sale);
  };

  const getDefaultPhotoTitle = (sale: Sale) => {
    const categoryLabel = categoryLabels[sale.product_category] || sale.product_category;
    return `${format(new Date(sale.date), 'yy/MM/dd')} ${categoryLabel}`;
  };

  const handleEdit = (sale: Sale) => {
    setEditingSale(sale);
    setSelectedSale(null);
  };

  const handleDelete = (sale: Sale) => {
    setDeleteTarget(sale);
  };

  const confirmDelete = () => {
    if (!deleteTarget) return;
    const target = deleteTarget;
    setDeleteTarget(null);
    setSelectedSale(null);
    startDeleteTransition(async () => {
      removeOptimisticSale(target.id);
      try {
        await deleteSale(target.id);
        // 로컬 목록에서도 제거해 새로고침 전까지 깜빡임 없이 유지(요약은 refresh로 갱신).
        setAllSales((prev) => prev.filter((s) => s.id !== target.id));
        router.refresh();
        toast.success('매출이 삭제되었습니다');
      } catch (error) {
        console.error('Failed to delete sale:', error);
        toast.error('매출 삭제에 실패했습니다');
      }
    });
  };

  const handleFormSuccess = (newSale?: Sale) => {
    router.refresh();
    if (newSale) {
      setShowPhotoPrompt(newSale);
    }
  };

  const handleLoadMore = useCallback(async () => {
    if (isLoadingMore || !hasMore) return;
    setIsLoadingMore(true);
    const version = dataVersionRef.current;
    const filters = debouncedSearch
      ? { ...initialFilters, search: debouncedSearch }
      : initialFilters;
    try {
      const result = await loadMoreSales(serverMonthParam, allSales.length, filters);
      // 로드 중 필터/네비게이션이 변경됐으면 stale 데이터 무시
      if (version !== dataVersionRef.current) return;
      setAllSales(prev => [...prev, ...result.sales]);
      setHasMore(result.hasMore);
    } catch (error) {
      console.error('Failed to load more sales:', error);
    } finally {
      if (version === dataVersionRef.current) {
        setIsLoadingMore(false);
      }
    }
  }, [isLoadingMore, hasMore, serverMonthParam, allSales.length, initialFilters, debouncedSearch]);

  const handleResetFilters = () => {
    setSearchQuery('');
    router.push(buildUrl({ category: [], payment: [], channel: [] }));
  };

  const handleOpenForm = () => {
    setInitialCustomer(undefined);
    setIsFormOpen(true);
  };

  return (
    <div className="space-y-6 px-4 sm:px-6 py-5 sm:py-7">
      {/* Header */}
      <PageHeader
        title="매출 관리"
        description="매출 내역을 등록하고 관리하세요"
        actions={
          <>
            <ExportButton getExportConfig={getExportConfig} className="flex-1 sm:flex-initial" />
            <Button onClick={handleOpenForm} className="flex-1 sm:flex-initial">
              <Plus className="w-4 h-4 mr-2" />
              매출 등록
            </Button>
          </>
        }
      />

      {/* Summary Cards */}
      <SalesSummary summary={summary} />

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <Select value={yearParam} onValueChange={handleYearChange}>
          <SelectTrigger className="w-[100px] bg-background">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">전체</SelectItem>
            {YEAR_OPTIONS.map(year => (
              <SelectItem key={year} value={year.toString()}>{year}년</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={monthParam} onValueChange={handleMonthChange}>
          <SelectTrigger className="w-[80px] bg-background">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">전체</SelectItem>
            {MONTH_OPTIONS.map(month => (
              <SelectItem key={month} value={month.toString()}>{month}월</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={dayParam} onValueChange={handleDayChange} disabled={isDayDisabled}>
          <SelectTrigger className="w-[80px] bg-background">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">전체</SelectItem>
            {DAY_OPTIONS.map(day => (
              <SelectItem key={day} value={day.toString()}>{day}일</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <CategoryMultiSelect
          options={categories.map(c => ({ value: c.value, label: c.label, color: c.color }))}
          selected={categoryFilter}
          onChange={handleCategoryChange}
          placeholder="카테고리"
        />
        <CategoryMultiSelect
          options={payments.map(pm => ({ value: pm.value, label: pm.label, color: pm.color }))}
          selected={paymentFilter}
          onChange={handlePaymentChange}
          placeholder="결제방식"
        />
        <CategoryMultiSelect
          options={Object.entries(CHANNEL_LABELS).map(([value, label]) => ({ value, label, color: '#6b7280' }))}
          selected={channelFilter}
          onChange={handleChannelChange}
          placeholder="예약방식"
          plain
        />
        <Button
          variant="outline"
          size="icon"
          className="h-9 w-9"
          onClick={() => setIsSettingsOpen(true)}
          aria-label="매출 설정"
        >
          <Settings className="w-4 h-4 text-muted-foreground" />
        </Button>
        <div className="relative flex-1 min-w-[150px] max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="검색..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-background"
            aria-label="매출 검색"
          />
        </div>
        <Button
          variant="outline"
          size="sm"
          className={TODAY_FILTER_ACTIVE_CLASS}
          onClick={handleTodayOnly}
          aria-label="오늘 매출만 보기"
        >
          <CalendarCheck className="w-3.5 h-3.5 mr-1.5" />
          오늘만
        </Button>
        <Button
          variant="default"
          size="sm"
          className="h-9 shrink-0"
          onClick={() => {
            setSearchQuery('');
            router.push('/admin/sales');
          }}
        >
          <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
          초기화
        </Button>
      </div>

      {/* Sales List */}
      <SalesList
        sales={optimisticSales}
        categoryLabels={categoryLabels}
        categoryColors={categoryColors}
        paymentLabels={paymentLabels}
        paymentColors={paymentColors}
        hasActiveFilters={hasActiveFilters}
        hasMore={hasMore}
        isLoadingMore={isLoadingMore || isSearching}
        onLoadMore={handleLoadMore}
        onSelectSale={handleSelectSale}
        onResetFilters={handleResetFilters}
        onOpenForm={handleOpenForm}
      />

      {/* Sale Form Dialog (Create/Edit) */}
      <SaleFormDialog
        open={isFormOpen || !!editingSale}
        onOpenChange={(open) => {
          if (!open) {
            setIsFormOpen(false);
            setEditingSale(null);
          }
        }}
        sale={editingSale}
        categories={categories}
        payments={payments}
        initialCustomer={initialCustomer}
        onSuccess={handleFormSuccess}
      />

      {/* Sale Detail Dialog */}
      <SaleDetailDialog
        sale={selectedSale}
        photos={selectedSalePhotos}
        reservations={selectedSaleReservations}
        categoryLabels={categoryLabels}
        categoryColors={categoryColors}
        paymentLabels={paymentLabels}
        paymentColors={paymentColors}
        onClose={() => setSelectedSale(null)}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onPhotoModal={handleOpenPhotoModal}
      />

      {/* Photo Prompt Dialog */}
      <Dialog open={!!showPhotoPrompt} onOpenChange={(open) => !open && setShowPhotoPrompt(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>사진 추가</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-muted-foreground text-sm">매출이 등록되었습니다. 완성한 꽃 사진을 추가하면 사진첩에서도 볼 수 있어요.</p>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowPhotoPrompt(null)}>
              나중에
            </Button>
            <Button
              onClick={() => {
                if (showPhotoPrompt) {
                  setPhotoModalSale(showPhotoPrompt);
                }
                setShowPhotoPrompt(null);
              }}
            >
              사진 추가
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Sale Photo Modal */}
      {photoModalSale && (
        <SalePhotoModal
          open={!!photoModalSale}
          onClose={() => setPhotoModalSale(null)}
          saleId={photoModalSale.id}
          defaultTitle={getDefaultPhotoTitle(photoModalSale)}
          onSuccess={() => router.refresh()}
        />
      )}

      {/* Delete Confirm Dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>매출 삭제</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-muted-foreground text-sm">
              이 매출 기록을 삭제하시겠습니까?
            </p>
            {deleteTarget && (
              <p className="text-muted-foreground text-xs mt-2">
                {format(new Date(deleteTarget.date), 'M월 d일', { locale: ko })} · {formatCurrency(deleteTarget.amount)}
              </p>
            )}
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              취소
            </Button>
            <Button variant="destructive" onClick={confirmDelete}>
              삭제
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Sales Settings Modal */}
      <SalesSettingsModal
        open={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        categories={categories}
        onRefresh={refreshSettings}
      />
    </div>
  );
}
