'use client';

import {useCallback, useEffect, useOptimistic, useState, useTransition} from 'react';
import {useRouter, useSearchParams} from 'next/navigation';
import {Button} from '@/components/ui/button';
import {Dialog, DialogContent, DialogHeader, DialogTitle} from '@/components/ui/dialog';
import {Plus, Settings} from 'lucide-react';
import {format} from 'date-fns';
import {ko} from '@/lib/date-locale';
import {toast} from 'sonner';
import type {SalesFilters} from '@/lib/actions/sales';
import {deleteSale, loadMoreSales} from '@/lib/actions/sales';
import dynamic from 'next/dynamic';
import {SalesSettingsModal} from '@/components/sales/SalesSettingsModal';
import type {SalesSummary as SalesSummaryType} from '@/lib/utils';
import {formatCurrency, isUnsettledUnpaid} from '@/lib/utils';
import type {Sale} from '@/types/database';
import {getPaymentMethods, getSaleCategories, getSaleChannels, PaymentMethod, SaleCategory, SaleChannel} from '@/lib/actions/sale-settings';
import {ExportButton} from '@/components/ui/export-button';
import type {ExportConfig} from '@/lib/export';
import {SalesSummary} from './components/SalesSummary';
import {SalesList} from './components/SalesList';
import {SaleFormDialog} from './components/SaleFormDialog';
import {SaleDetailDialog} from './components/SaleDetailDialog';
import {SalesFiltersUI} from './components/SalesFilters';
import {useSaleDetail} from './hooks/use-sale-detail';
import {useInfiniteList} from '@/hooks/use-infinite-list';
import {useQuickCreate} from '@/hooks/use-quick-create';

const SalePhotoModal = dynamic(
  () => import('@/components/sales/SalePhotoModal').then(mod => ({ default: mod.SalePhotoModal })),
  { loading: () => null, ssr: false },
);

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
  initialChannels: SaleChannel[];
  initialSelectedSale?: Sale | null;
}

export function SalesClient({ initialSales, initialHasMore, initialSummary, monthParam: serverMonthParam, currentYear, currentMonth, currentDay, initialFilters, initialCategories, initialPayments, initialChannels, initialSelectedSale }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingSale, setEditingSale] = useState<Sale | null>(null);
  // 필터는 URL 파라미터 기반 (서버 쿼리에 적용됨)
  const paymentFilter: string[] = initialFilters.payment ?? [];
  const categoryFilter: string[] = initialFilters.category ?? [];
  const channelFilter: string[] = initialFilters.channel ?? [];
  const [searchQuery, setSearchQuery] = useState('');
  const [photoModalSale, setPhotoModalSale] = useState<Sale | null>(null);
  const [showPhotoPrompt, setShowPhotoPrompt] = useState<Sale | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [fabOpen, setFabOpen] = useState(false);
  const [categories, setCategories] = useState<SaleCategory[]>(initialCategories);
  const [payments, setPayments] = useState<PaymentMethod[]>(initialPayments);
  const [channels, setChannels] = useState<SaleChannel[]>(initialChannels);
  const [deleteTarget, setDeleteTarget] = useState<Sale | null>(null);
  const [, startDeleteTransition] = useTransition();
  const [initialCustomer, setInitialCustomer] = useState<{ name: string; id: string | null; phone: string | null } | undefined>();

  // 매출 상세 선택 + 연결 사진/예약 로드 + URL saleId 딥링크
  const {
    selectedSale,
    setSelectedSale,
    selectedSalePhotos,
    selectedSaleReservations,
    handleSelectSale,
  } = useSaleDetail({ initialSelectedSale });

  // 무한스크롤 + 디바운스 검색 (공용 훅 — 리셋·stale 가드 포함)
  const {
    items: allSales,
    setItems: setAllSales,
    hasMore,
    isLoadingMore,
    isSearching,
    loadMore: handleLoadMore,
  } = useInfiniteList<Sale>({
    initialItems: initialSales,
    initialHasMore,
    loadPage: async (offset, search) => {
      const filters = search ? { ...initialFilters, search } : initialFilters;
      const result = await loadMoreSales(serverMonthParam, offset, filters);
      return { items: result.sales, hasMore: result.hasMore };
    },
    searchQuery,
    onSearchError: () => toast.error('검색에 실패했습니다'),
  });

  // 낙관적 삭제: 즉시 목록에서 제거하고, 서버 실패 시 자동 롤백된다.
  const [optimisticSales, removeOptimisticSale] = useOptimistic(
    allSales,
    (sales, deletedId: string) => sales.filter((s) => s.id !== deletedId),
  );

  // 결제방식 라벨 맵 생성 (value -> label). 카테고리·채널 라벨은 응답에 동봉됨.

  // 설정 새로고침
  const refreshSettings = async () => {
    const [cats, pays, chs] = await Promise.all([getSaleCategories(), getPaymentMethods(), getSaleChannels()]);
    setCategories(cats);
    setPayments(pays);
    setChannels(chs);
  };

  // ?new=1 — 빠른 등록(대시보드)에서 진입 시 매출 등록 폼을 즉시 오픈
  useQuickCreate(() => {
    setInitialCustomer(undefined);
    setIsFormOpen(true);
  });

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

  // 내보내기·렌더 모두 낙관적 목록을 기준으로 한다(삭제 진행 중 ghost 행 방지).
  const filteredSales = optimisticSales;

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
      { header: '카테고리', accessor: (s) => s.category_label || '' },
      { header: '금액', accessor: (s) => Number(s.amount) || 0, format: 'currency' },
      { header: '결제방법', accessor: (s) => isUnsettledUnpaid(s) ? '미수' : (s.payment_method_label ?? '') },
      { header: '채널', accessor: (s) => s.channel_label || '' },
      { header: '고객명', accessor: (s) => String(s.customer_name || '') },
      { header: '메모', accessor: (s) => String(s.memo || '') },
    ],
    data: filteredSales,
    });
  }, [filteredSales, currentYear, currentMonth, currentDay, yearLabel, monthLabel, dayLabel]);

  const yearParam = currentYear === 0 ? 'all' : currentYear.toString();
  const monthParam = currentMonth === 0 ? 'all' : currentMonth.toString();
  const dayParam = currentDay === 0 ? 'all' : currentDay.toString();

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

  const handleTodayOnly = () => {
    const now = new Date();
    const y = now.getFullYear().toString();
    const m = (now.getMonth() + 1).toString();
    const d = now.getDate().toString();
    // 이미 오늘이면 해제 (이번 달 전체로)
    if (currentDay === now.getDate() && currentMonth === now.getMonth() + 1 && currentYear === now.getFullYear()) {
      router.push(buildUrl({ day: 'all' }));
    } else {
      router.push(buildUrl({ year: y, month: m, day: d }));
    }
  };

  const handleMonthNav = (direction: -1 | 1) => {
    let y = currentYear || new Date().getFullYear();
    let m = currentMonth || new Date().getMonth() + 1;
    m += direction;
    if (m > 12) { m = 1; y += 1; }
    if (m < 1) { m = 12; y -= 1; }
    router.push(buildUrl({ year: y.toString(), month: m.toString(), day: 'all' }));
  };

  const handleDateRangeApply = (startDate: string, endDate: string) => {
    const params = new URLSearchParams();
    params.set('startDate', startDate);
    params.set('endDate', endDate);
    if (categoryFilter.length > 0) params.set('category', categoryFilter.join(','));
    if (paymentFilter.length > 0) params.set('payment', paymentFilter.join(','));
    if (channelFilter.length > 0) params.set('channel', channelFilter.join(','));
    router.push(`/admin/sales?${params.toString()}`);
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
    return `${format(new Date(sale.date), 'yy/MM/dd')} ${sale.category_label ?? ''}`.trim();
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

  const handleResetFilters = () => {
    setSearchQuery('');
    router.push(buildUrl({ category: [], payment: [], channel: [] }));
  };

  const handleOpenForm = () => {
    setInitialCustomer(undefined);
    setIsFormOpen(true);
  };

  return (
    <div className="space-y-6 px-4 sm:px-6 py-1 sm:py-2 lg:-mx-6 xl:-mx-8">

      {/* Filters (날짜 nav → 요약 → 드롭다운/검색) */}
      <SalesFiltersUI
        currentYear={currentYear}
        currentMonth={currentMonth}
        currentDay={currentDay}
        categoryFilter={categoryFilter}
        paymentFilter={paymentFilter}
        channelFilter={channelFilter}
        searchQuery={searchQuery}
        categories={categories}
        payments={payments}
        channels={channels}
        onMonthNav={handleMonthNav}
        onTodayOnly={handleTodayOnly}
        onDateRangeApply={handleDateRangeApply}
        onCategoryChange={handleCategoryChange}
        onPaymentChange={handlePaymentChange}
        onChannelChange={handleChannelChange}
        onSearchChange={setSearchQuery}
        onReset={handleResetFilters}
      >
        <SalesSummary summary={summary} />
      </SalesFiltersUI>

      {/* Sales List */}
      <SalesList
        sales={filteredSales}
        hasActiveFilters={hasActiveFilters}
        hasMore={hasMore}
        isLoadingMore={isLoadingMore || isSearching}
        onLoadMore={handleLoadMore}
        onSelectSale={handleSelectSale}
        onOpenPhoto={handleOpenPhotoModal}
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
        channels={channels}
        initialCustomer={initialCustomer}
        onSuccess={handleFormSuccess}
      />

      {/* Sale Detail Dialog */}
      <SaleDetailDialog
        sale={selectedSale}
        photos={selectedSalePhotos}
        reservations={selectedSaleReservations}
        onClose={() => setSelectedSale(null)}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onPhotoModal={handleOpenPhotoModal}
      />

      {/* Photo Prompt Dialog */}
      <Dialog open={!!showPhotoPrompt} onOpenChange={(open) => !open && setShowPhotoPrompt(null)}>
        <DialogContent className="sm:max-w-sm">
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
        <DialogContent className="sm:max-w-sm">
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
        payments={payments}
        channels={channels}
        onRefresh={refreshSettings}
      />

      {/* FAB — Speed Dial */}
      <div className="fixed bottom-20 right-4 lg:bottom-6 lg:right-6 z-40 flex flex-col items-end gap-2">
        {fabOpen && (
          <div className="flex flex-col items-end gap-2 animate-in fade-in slide-in-from-bottom-2 duration-200">
            <button
              type="button"
              onClick={() => { setFabOpen(false); handleOpenForm(); }}
              className="flex items-center gap-2 h-10 pr-4 pl-3 rounded-full bg-brand text-white text-sm font-medium shadow-lg"
            >
              <Plus className="w-4 h-4" />
              매출 등록
            </button>
            <ExportButton
              getExportConfig={getExportConfig}
              className="flex items-center gap-2 h-10 pr-4 pl-3 rounded-full bg-foreground text-background text-sm font-medium shadow-lg"
            />
            <button
              type="button"
              onClick={() => { setFabOpen(false); setIsSettingsOpen(true); }}
              className="flex items-center gap-2 h-10 pr-4 pl-3 rounded-full bg-foreground text-background text-sm font-medium shadow-lg"
            >
              <Settings className="w-4 h-4" />
              설정
            </button>
          </div>
        )}
        <button
          type="button"
          onClick={() => setFabOpen(!fabOpen)}
          className={`w-12 h-12 rounded-full shadow-lg flex items-center justify-center transition-transform duration-200 ${
            fabOpen ? 'bg-muted-foreground rotate-45' : 'bg-brand'
          }`}
          aria-label="액션 메뉴"
        >
          <Plus className="w-5 h-5 text-white" />
        </button>
      </div>
    </div>
  );
}
