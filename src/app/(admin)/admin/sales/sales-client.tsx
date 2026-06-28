'use client';

import {useCallback, useState} from 'react';
import {useRouter} from 'next/navigation';
import {format} from 'date-fns';
import {toast} from 'sonner';
import type {SalesFilters} from '@/lib/actions/sales';
import {loadMoreSales} from '@/lib/actions/sales';
import dynamic from 'next/dynamic';
import {SalesSettingsModal} from '@/app/(admin)/admin/sales/components/sales-settings-modal';
import type {SalesSummary as SalesSummaryType} from '@/lib/utils';
import type {Sale} from '@/types/database';
import {getPaymentMethods, getSaleCategories, getSaleChannels, PaymentMethod, SaleCategory, SaleChannel} from '@/lib/actions/sale-settings';
import {buildSalesExportConfig} from './sales-export';
import {SalesSummary} from './components/sales-summary';
import {SalesList} from './components/sales-list';
import {SaleFormDialog} from './components/sale-form-dialog';
import {SaleDetailDialog} from './components/sale-detail-dialog';
import {SalesFiltersUI} from './components/sales-filters';
import {SaleDeleteDialog} from './components/sale-delete-dialog';
import {SalePhotoPromptDialog} from './components/sale-photo-prompt-dialog';
import {SalesFab} from './components/sales-fab';
import {useSaleDetail} from './hooks/use-sale-detail';
import {useSaleDelete} from './hooks/use-sale-delete';
import {useSalesUrlFilters} from './hooks/use-sales-url-filters';
import {useSaleCreateParams, type SaleInitialCustomer} from './hooks/use-sale-create-params';
import {useInfiniteList} from '@/hooks/use-infinite-list';
import {useQuickCreate} from '@/hooks/use-quick-create';

const SalePhotoModal = dynamic(
  () => import('@/components/sales/sale-photo-modal').then(mod => ({ default: mod.SalePhotoModal })),
  { loading: () => null, ssr: false },
);

interface Props {
  initialSales: Sale[];
  initialHasMore: boolean;
  initialSummary: SalesSummaryType;
  monthParam: string | null;
  dateRange: { startDate: string; endDate: string } | null;
  currentYear: number;
  currentMonth: number;
  currentDay: number;
  initialFilters: SalesFilters;
  initialCategories: SaleCategory[];
  initialPayments: PaymentMethod[];
  initialChannels: SaleChannel[];
  initialSelectedSale?: Sale | null;
}

export function SalesClient({ initialSales, initialHasMore, initialSummary, monthParam: serverMonthParam, dateRange: serverDateRange, currentYear, currentMonth, currentDay, initialFilters, initialCategories, initialPayments, initialChannels, initialSelectedSale }: Props) {
  const router = useRouter();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingSale, setEditingSale] = useState<Sale | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [photoModalSale, setPhotoModalSale] = useState<Sale | null>(null);
  const [showPhotoPrompt, setShowPhotoPrompt] = useState<Sale | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [categories, setCategories] = useState<SaleCategory[]>(initialCategories);
  const [payments, setPayments] = useState<PaymentMethod[]>(initialPayments);
  const [channels, setChannels] = useState<SaleChannel[]>(initialChannels);
  const [initialCustomer, setInitialCustomer] = useState<SaleInitialCustomer | undefined>();

  // URL 파라미터 기반 필터(년/월/일 + 카테고리·결제·채널) + 내비 핸들러
  const {
    categoryFilter,
    paymentFilter,
    channelFilter,
    handleTodayOnly,
    handleMonthNav,
    handleMonthSelect,
    handleDateRangeApply,
    handleCategoryChange,
    handlePaymentChange,
    handleChannelChange,
    resetUrlFilters,
  } = useSalesUrlFilters({ currentYear, currentMonth, currentDay, dateRange: serverDateRange, initialFilters });

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
      const result = await loadMoreSales(serverMonthParam, offset, filters, serverDateRange ?? undefined);
      return { items: result.sales, hasMore: result.hasMore };
    },
    searchQuery,
    onSearchError: () => toast.error('검색에 실패했습니다'),
  });

  // 삭제 확인 + 낙관적 목록 제거(서버 실패 시 자동 롤백)
  const {
    optimisticSales,
    deleteTarget,
    setDeleteTarget,
    handleDelete,
    confirmDelete,
  } = useSaleDelete({
    sales: allSales,
    setSales: setAllSales,
    onCloseDetail: () => setSelectedSale(null),
  });

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

  // URL 파라미터(?action=create)로 등록 모달 자동 오픈 (고객 페이지에서 연결)
  const handleOpenCreateFromUrl = useCallback((customer?: SaleInitialCustomer) => {
    if (customer) {
      setInitialCustomer(customer);
    }
    setIsFormOpen(true);
  }, []);
  useSaleCreateParams({ currentYear, currentMonth, currentDay, onOpenCreate: handleOpenCreateFromUrl });

  // 내보내기·렌더 모두 낙관적 목록을 기준으로 한다(삭제 진행 중 ghost 행 방지).
  const filteredSales = optimisticSales;

  // 서버에서 필터 적용된 요약 (페이지네이션 무관)
  const summary = initialSummary;

  const hasActiveFilters = paymentFilter.length > 0 || categoryFilter.length > 0 || channelFilter.length > 0 || searchQuery !== '';

  const getExportConfig = useCallback(
    () => buildSalesExportConfig({ sales: filteredSales, currentYear, currentMonth, currentDay, dateRange: serverDateRange }),
    [filteredSales, currentYear, currentMonth, currentDay, serverDateRange],
  );

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

  const handleFormSuccess = (newSale?: Sale) => {
    router.refresh();
    if (newSale) {
      setShowPhotoPrompt(newSale);
    }
  };

  const handleResetFilters = () => {
    setSearchQuery('');
    resetUrlFilters();
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
        dateRange={serverDateRange}
        categoryFilter={categoryFilter}
        paymentFilter={paymentFilter}
        channelFilter={channelFilter}
        searchQuery={searchQuery}
        categories={categories}
        payments={payments}
        channels={channels}
        onMonthNav={handleMonthNav}
        onMonthSelect={handleMonthSelect}
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
      <SalePhotoPromptDialog
        sale={showPhotoPrompt}
        onClose={() => setShowPhotoPrompt(null)}
        onAddPhoto={setPhotoModalSale}
      />

      {/* Sale Photo Modal */}
      {photoModalSale && (
        <SalePhotoModal
          open={!!photoModalSale}
          onClose={() => setPhotoModalSale(null)}
          saleId={photoModalSale.id}
          defaultTitle={getDefaultPhotoTitle(photoModalSale)}
          customerId={photoModalSale.customer_id}
          onSuccess={() => router.refresh()}
        />
      )}

      {/* Delete Confirm Dialog */}
      <SaleDeleteDialog
        target={deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
      />

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
      <SalesFab
        onOpenForm={handleOpenForm}
        onOpenSettings={() => setIsSettingsOpen(true)}
        getExportConfig={getExportConfig}
      />
    </div>
  );
}
