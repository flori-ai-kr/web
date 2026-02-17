'use client';

import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, Search, Settings, Loader2, RotateCcw } from 'lucide-react';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { toast } from 'sonner';
import { deleteSale, loadMoreSales } from '@/lib/actions/sales';
import { getReservationsForSale } from '@/lib/actions/reservations';
import { getPhotoCardBySaleId } from '@/lib/actions/photo-cards';
import { SalePhotoModal } from '@/components/sales/SalePhotoModal';
import { SalesSettingsModal } from '@/components/sales/SalesSettingsModal';
import { formatCurrency } from '@/lib/utils';
import type { SalesSummary as SalesSummaryType } from '@/lib/utils';
import type { PhotoCard, Sale, CardCompanySetting, Reservation } from '@/types/database';
import type { SalesFilters } from '@/lib/actions/sales';
import { SaleCategory, PaymentMethod, getSaleCategories, getPaymentMethods } from '@/lib/actions/sale-settings';
import { getCardCompanySettings } from '@/lib/actions/settings';
import { ExportButton } from '@/components/ui/export-button';
import type { ExportConfig } from '@/lib/export';
import { CHANNEL_LABELS } from '@/lib/constants';
import { SalesSummary } from './components/SalesSummary';
import { SalesList } from './components/SalesList';
import { SaleFormDialog } from './components/SaleFormDialog';
import { SaleDetailDialog } from './components/SaleDetailDialog';

// Year options: 2024 ~ 2030
const YEAR_OPTIONS = Array.from({ length: 7 }, (_, i) => 2024 + i);
// Month options: 1 ~ 12
const MONTH_OPTIONS = Array.from({ length: 12 }, (_, i) => i + 1);

interface Props {
  initialSales: Sale[];
  initialHasMore: boolean;
  initialSummary: SalesSummaryType;
  monthParam: string | null;
  currentYear: number;
  currentMonth: number;
  initialFilters: SalesFilters;
  initialCategories: SaleCategory[];
  initialPayments: PaymentMethod[];
  initialCardCompanies: CardCompanySetting[];
  initialSelectedSale?: Sale | null;
}

export function SalesClient({ initialSales, initialHasMore, initialSummary, monthParam: serverMonthParam, currentYear, currentMonth, initialFilters, initialCategories, initialPayments, initialCardCompanies, initialSelectedSale }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedSale, setSelectedSale] = useState<Sale | null>(initialSelectedSale || null);
  const [editingSale, setEditingSale] = useState<Sale | null>(null);
  // 필터는 URL 파라미터 기반 (서버 쿼리에 적용됨)
  const paymentFilter = initialFilters.payment || 'all';
  const categoryFilter = initialFilters.category || 'all';
  const channelFilter = initialFilters.channel || 'all';
  const [searchQuery, setSearchQuery] = useState('');
  const [photoModalSale, setPhotoModalSale] = useState<Sale | null>(null);
  const [showPhotoPrompt, setShowPhotoPrompt] = useState<Sale | null>(null);
  const [selectedSalePhotos, setSelectedSalePhotos] = useState<PhotoCard | null>(null);
  const [selectedSaleReservations, setSelectedSaleReservations] = useState<Reservation[]>([]);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [categories, setCategories] = useState<SaleCategory[]>(initialCategories);
  const [payments, setPayments] = useState<PaymentMethod[]>(initialPayments);
  const [cardCompanies, setCardCompanies] = useState<CardCompanySetting[]>(initialCardCompanies);
  const [deleteTarget, setDeleteTarget] = useState<Sale | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [initialCustomer, setInitialCustomer] = useState<{ name: string; id: string | null; phone: string | null } | undefined>();

  // 무한스크롤 상태
  const [allSales, setAllSales] = useState<Sale[]>(initialSales);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const dataVersionRef = useRef(0);

  // initialSales가 변경되면(년/월/필터 변경) 리셋
  useEffect(() => {
    dataVersionRef.current += 1;
    setAllSales(initialSales);
    setHasMore(initialHasMore);
    setIsLoadingMore(false);
  }, [initialSales, initialHasMore]);

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
    const [cats, pays, cards] = await Promise.all([getSaleCategories(), getPaymentMethods(), getCardCompanySettings()]);
    setCategories(cats);
    setPayments(pays);
    setCardCompanies(cards);
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
      router.replace(`/sales?${cleanParams.toString()}`, { scroll: false });
    }
  }, [searchParams, router, currentYear, currentMonth]);

  // 서버에서 필터 적용된 데이터 → 검색만 클라이언트에서 추가 필터
  const filteredSales = useMemo(() => {
    if (!searchQuery) return allSales;

    const q = searchQuery.toLowerCase();
    return allSales.filter(s =>
      (s.product_category || s.product_name || '').toLowerCase().includes(q) ||
      s.customer_name?.toLowerCase().includes(q)
    );
  }, [allSales, searchQuery]);

  // 서버에서 필터 적용된 요약 (페이지네이션 무관)
  const summary = initialSummary;

  const hasActiveFilters = paymentFilter !== 'all' || categoryFilter !== 'all' || channelFilter !== 'all' || searchQuery !== '';

  const yearLabel = currentYear === 0 ? '전체' : `${currentYear}년`;
  const monthLabel = currentMonth === 0 ? '전체' : `${currentMonth}월`;

  const getExportConfig = useCallback((): ExportConfig<Sale> => ({
    filename: currentYear === 0 || currentMonth === 0 ? '매출_전체' : `매출_${currentYear}-${String(currentMonth).padStart(2, '0')}`,
    title: `매출 내역 (${yearLabel} ${monthLabel})`,
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
  }), [filteredSales, currentYear, currentMonth, yearLabel, monthLabel, categoryLabels, paymentLabels]);

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

  // URL 빌드 헬퍼: 'all' 값이면 파라미터 생략
  const buildUrl = useCallback((overrides: Record<string, string> = {}) => {
    const p = {
      year: yearParam,
      month: monthParam,
      category: categoryFilter,
      payment: paymentFilter,
      channel: channelFilter,
      ...overrides,
    };
    const params = new URLSearchParams();
    params.set('year', p.year);
    params.set('month', p.month);
    if (p.category !== 'all') params.set('category', p.category);
    if (p.payment !== 'all') params.set('payment', p.payment);
    if (p.channel !== 'all') params.set('channel', p.channel);
    return `/sales?${params.toString()}`;
  }, [yearParam, monthParam, categoryFilter, paymentFilter, channelFilter]);

  const handleYearChange = (year: string) => {
    router.push(buildUrl({ year }));
  };

  const handleMonthChange = (month: string) => {
    router.push(buildUrl({ month }));
  };

  const handleCategoryChange = (category: string) => {
    router.push(buildUrl({ category }));
  };

  const handlePaymentChange = (payment: string) => {
    router.push(buildUrl({ payment }));
  };

  const handleChannelChange = (channel: string) => {
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

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await deleteSale(deleteTarget.id);
      setDeleteTarget(null);
      setSelectedSale(null);
      router.refresh();
      toast.success('매출이 삭제되었습니다');
    } catch (error) {
      console.error('Failed to delete sale:', error);
      toast.error('매출 삭제에 실패했습니다');
    } finally {
      setIsDeleting(false);
    }
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
    try {
      const result = await loadMoreSales(serverMonthParam, allSales.length, initialFilters);
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
  }, [isLoadingMore, hasMore, serverMonthParam, allSales.length, initialFilters]);

  const handleResetFilters = () => {
    setSearchQuery('');
    router.push(buildUrl({ category: 'all', payment: 'all', channel: 'all' }));
  };

  const handleOpenForm = () => {
    setInitialCustomer(undefined);
    setIsFormOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-foreground tracking-tight">매출 관리</h1>
          <p className="text-sm text-muted-foreground mt-1">매출 내역을 등록하고 관리하세요</p>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <ExportButton getExportConfig={getExportConfig} className="flex-1 sm:flex-initial" />
          <Button onClick={handleOpenForm} className="flex-1 sm:flex-initial">
            <Plus className="w-4 h-4 mr-2" />
            매출 등록
          </Button>
        </div>
      </div>

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
        <Select value={categoryFilter} onValueChange={handleCategoryChange}>
          <SelectTrigger className="w-auto min-w-[140px] bg-background">
            <div className="flex items-center gap-1.5">
              <span className="text-muted-foreground text-xs">카테고리</span>
              {categoryFilter === 'all' ? (
                <span>전체</span>
              ) : (
                <span
                  className="px-1.5 py-0.5 text-xs font-medium rounded"
                  style={{ backgroundColor: `${categoryColors[categoryFilter]}40`, color: categoryColors[categoryFilter] }}
                >
                  {categoryLabels[categoryFilter] || categoryFilter}
                </span>
              )}
            </div>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">전체</SelectItem>
            {categories.map(cat => (
              <SelectItem key={cat.id} value={cat.value}>
                <span
                  className="px-1.5 py-0.5 text-xs font-medium rounded"
                  style={{ backgroundColor: `${cat.color}40`, color: cat.color }}
                >
                  {cat.label}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={paymentFilter} onValueChange={handlePaymentChange}>
          <SelectTrigger className="w-auto min-w-[130px] bg-background">
            <div className="flex items-center gap-1.5">
              <span className="text-muted-foreground text-xs">결제방식</span>
              {paymentFilter === 'all' ? (
                <span>전체</span>
              ) : (
                <span
                  className="px-1.5 py-0.5 text-xs font-medium rounded"
                  style={{ backgroundColor: `${paymentColors[paymentFilter]}40`, color: paymentColors[paymentFilter] }}
                >
                  {paymentLabels[paymentFilter] || paymentFilter}
                </span>
              )}
            </div>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">전체</SelectItem>
            {payments.map(pm => (
              <SelectItem key={pm.id} value={pm.value}>
                <span
                  className="px-1.5 py-0.5 text-xs font-medium rounded"
                  style={{ backgroundColor: `${pm.color}40`, color: pm.color }}
                >
                  {pm.label}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={channelFilter} onValueChange={handleChannelChange}>
          <SelectTrigger className="w-auto min-w-[130px] bg-background">
            <div className="flex items-center gap-1.5">
              <span className="text-muted-foreground text-xs">예약방식</span>
              <span>{channelFilter === 'all' ? '전체' : (CHANNEL_LABELS[channelFilter] || channelFilter)}</span>
            </div>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">전체</SelectItem>
            {Object.entries(CHANNEL_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
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
          variant="default"
          size="sm"
          className="h-9 shrink-0"
          onClick={() => {
            setSearchQuery('');
            router.push('/sales');
          }}
        >
          <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
          초기화
        </Button>
      </div>

      {/* Sales List */}
      <SalesList
        sales={filteredSales}
        categoryLabels={categoryLabels}
        categoryColors={categoryColors}
        paymentLabels={paymentLabels}
        paymentColors={paymentColors}
        hasActiveFilters={hasActiveFilters}
        hasMore={hasMore}
        isLoadingMore={isLoadingMore}
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
        cardCompanies={cardCompanies}
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
            <Button variant="outline" onClick={() => setDeleteTarget(null)} disabled={isDeleting}>
              취소
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              disabled={isDeleting}
            >
              {isDeleting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {isDeleting ? '삭제 중...' : '삭제'}
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
