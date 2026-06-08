'use client';

import {useCallback, useEffect, useMemo, useOptimistic, useState, useTransition} from 'react';
import {useRouter, useSearchParams} from 'next/navigation';
import {Button} from '@/components/ui/button';
import {PageHeader} from '@/components/layout/PageHeader';
import {Card, CardContent} from '@/components/ui/card';
import {Input} from '@/components/ui/input';
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from '@/components/ui/select';
import {Dialog, DialogContent, DialogHeader, DialogTitle} from '@/components/ui/dialog';
import {CalendarDays, Plus, Search, Settings, UserPlus, Users} from 'lucide-react';
import {format, subDays} from 'date-fns';
import {toast} from 'sonner';
import {deleteCustomer, getCustomerById, getCustomerSales} from '@/lib/actions/customers';
import {cn} from '@/lib/utils';
import type {Customer, CustomerGradeConfig, Sale} from '@/types/database';
import {ExportButton} from '@/components/ui/export-button';
import type {ExportConfig} from '@/lib/export';
import type {SaleCategory} from '@/lib/actions/sale-settings';
import {CustomerCard, genderLabels} from './components/CustomerCard';
import {CustomerFormDialog} from './components/CustomerFormDialog';
import {CustomerDetailDialog} from './components/CustomerDetailDialog';
import {CustomerGradesModal} from './components/CustomerGradesModal';

type SortBy = 'recent' | 'newest' | 'oldest' | 'name' | 'purchase_count' | 'purchase_amount';
type GenderFilter = 'all' | 'male' | 'female';

interface Props {
  initialCustomers: Customer[];
  initialCategories: SaleCategory[];
  initialGrades: CustomerGradeConfig[];
}

export function CustomersClient({ initialCustomers, initialCategories, initialGrades }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [gradeFilter, setGradeFilter] = useState('all');
  const [genderFilter, setGenderFilter] = useState<GenderFilter>('all');
  const [sortBy, setSortBy] = useState<SortBy>('recent');
  const [searchQuery, setSearchQuery] = useState('');
  const [fabOpen, setFabOpen] = useState(false);
  const [isGradesOpen, setIsGradesOpen] = useState(false);
  const [customerSales, setCustomerSales] = useState<Sale[]>([]);
  const [isLoadingSales, setIsLoadingSales] = useState(false);
  const [isLoadingMoreSales, setIsLoadingMoreSales] = useState(false);
  const [hasMoreSales, setHasMoreSales] = useState(false);
  const [salesPage, setSalesPage] = useState(0);
  const [deleteTarget, setDeleteTarget] = useState<Customer | null>(null);
  const [, startDeleteTransition] = useTransition();

  // 낙관적 삭제: 즉시 카드를 제거하고, 서버 실패 시 자동 롤백된다.
  const [optimisticCustomers, removeOptimisticCustomer] = useOptimistic(
    initialCustomers,
    (list, deletedId: string) => list.filter((c) => c.id !== deletedId),
  );

  // Sort function
  const sortCustomers = useCallback((customers: Customer[]) => {
    return [...customers].sort((a, b) => {
      switch (sortBy) {
        case 'recent': {
          // 최근 구매순 (nulls last)
          const aTime = a.last_purchase_date ? new Date(a.last_purchase_date).getTime() : -Infinity;
          const bTime = b.last_purchase_date ? new Date(b.last_purchase_date).getTime() : -Infinity;
          return bTime - aTime;
        }
        case 'newest':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case 'oldest':
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        case 'name':
          return a.name.localeCompare(b.name, 'ko');
        case 'purchase_count':
          return b.total_purchase_count - a.total_purchase_count;
        case 'purchase_amount':
          return b.total_purchase_amount - a.total_purchase_amount;
        default:
          return 0;
      }
    });
  }, [sortBy]);

  const filteredCustomers = useMemo(() => {
    const filtered = optimisticCustomers
      .filter(c => gradeFilter === 'all' || c.grade === gradeFilter)
      .filter(c => genderFilter === 'all' || c.gender === genderFilter)
      .filter(c => {
        if (!searchQuery) return true;
        const q = searchQuery.toLowerCase();
        const qDigits = q.replace(/-/g, '');
        return c.name.toLowerCase().includes(q) || c.phone.includes(q) || c.phone.replace(/-/g, '').includes(qDigits);
      });
    return sortCustomers(filtered);
  }, [optimisticCustomers, gradeFilter, genderFilter, searchQuery, sortCustomers]);

  // VIP·단골 통계는 등급명 기준(임계값이 가장 높은 상위 2개 등급)으로 집계한다.
  const topGradeNames = useMemo(() => {
    return initialGrades
      .filter(g => g.threshold != null)
      .sort((a, b) => (b.threshold ?? 0) - (a.threshold ?? 0))
      .slice(0, 2)
      .map(g => g.name);
  }, [initialGrades]);

  const stats = useMemo(() => {
    const total = initialCustomers.length;
    const regularVip = initialCustomers.filter(c => c.grade != null && topGradeNames.includes(c.grade)).length;
    const thirtyDaysAgo = format(subDays(new Date(), 30), 'yyyy-MM-dd');
    const recentBuyers = initialCustomers.filter(c => c.last_purchase_date && c.last_purchase_date >= thirtyDaysAgo).length;
    return { total, regularVip, recentBuyers };
  }, [initialCustomers, topGradeNames]);

  const hasActiveFilters = gradeFilter !== 'all' || genderFilter !== 'all' || searchQuery !== '' || sortBy !== 'recent';

  const resetFilters = () => {
    setGradeFilter('all');
    setGenderFilter('all');
    setSearchQuery('');
    setSortBy('recent');
  };

  const getExportConfig = useCallback((): ExportConfig<Customer> => ({
    filename: `고객_${format(new Date(), 'yyyy-MM-dd')}`,
    title: '고객 목록',
    columns: [
      { header: '이름', accessor: (c) => String(c.name || '') },
      { header: '전화번호', accessor: (c) => String(c.phone || '') },
      { header: '등급', accessor: (c) => c.grade || '' },
      { header: '성별', accessor: (c) => c.gender ? genderLabels[c.gender] || '' : '' },
      { header: '구매횟수', accessor: (c) => Number(c.total_purchase_count) || 0 },
      { header: '총구매금액', accessor: (c) => Number(c.total_purchase_amount) || 0, format: 'currency' },
      { header: '최근구매일', accessor: (c) => String(c.last_purchase_date || '') },
      { header: '메모', accessor: (c) => String(c.memo || '') },
    ],
    data: filteredCustomers,
  }), [filteredCustomers]);

  const handleSelectCustomer = async (customer: Customer) => {
    setSelectedCustomer(customer);
    setCustomerSales([]);
    setSalesPage(0);
    setHasMoreSales(false);
    setIsLoadingSales(true);
    try {
      const result = await getCustomerSales(customer.id, 0);
      setCustomerSales(result.sales);
      setHasMoreSales(result.hasMore);
    } catch (error) {
      console.error('Failed to load customer sales:', error);
    } finally {
      setIsLoadingSales(false);
    }
  };

  const handleLoadMoreSales = async () => {
    if (!selectedCustomer || isLoadingMoreSales || !hasMoreSales) return;
    const nextPage = salesPage + 1;
    setIsLoadingMoreSales(true);
    try {
      const result = await getCustomerSales(selectedCustomer.id, nextPage);
      setCustomerSales((prev) => [...prev, ...result.sales]);
      setHasMoreSales(result.hasMore);
      setSalesPage(nextPage);
    } catch (error) {
      console.error('Failed to load more sales:', error);
    } finally {
      setIsLoadingMoreSales(false);
    }
  };

  // URL 파라미터로 고객 상세 자동 오픈 (매출·사진첩 페이지에서 연결)
  useEffect(() => {
    const customerId = searchParams.get('customerId');
    if (!customerId) return;
    router.replace('/admin/customers', { scroll: false });

    const customer = initialCustomers.find(c => c.id === customerId);
    if (customer) {
      handleSelectCustomer(customer);
      return;
    }
    // 현재 로드된 목록에 없으면(다른 페이지 고객) 단건 조회로 상세를 연다.
    void getCustomerById(customerId)
      .then((fetched) => {
        if (fetched) handleSelectCustomer(fetched);
      })
      .catch((error) => {
        console.error('Failed to load customer for deep link:', error);
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleFormSuccess = () => {
    router.refresh();
  };

  const handleGradesChanged = () => {
    router.refresh();
  };

  const handleEdit = (customer: Customer) => {
    setEditingCustomer(customer);
    setSelectedCustomer(null);
  };

  const handleDelete = async (customer: Customer) => {
    setDeleteTarget(customer);
    setSelectedCustomer(null);
  };

  const confirmDelete = () => {
    if (!deleteTarget) return;
    const target = deleteTarget;
    setDeleteTarget(null);
    setSelectedCustomer(null);
    startDeleteTransition(async () => {
      removeOptimisticCustomer(target.id);
      try {
        await deleteCustomer(target.id);
        router.refresh();
        toast.success('고객이 삭제되었습니다');
      } catch (error) {
        console.error('Failed to delete customer:', error);
        toast.error('고객 삭제에 실패했습니다');
      }
    });
  };

  const handleSaleRegister = (customer: Customer) => {
    const params = new URLSearchParams({
      action: 'create',
      customer_name: customer.name,
      customer_phone: customer.phone,
      customer_id: customer.id,
    });
    router.push(`/admin/sales?${params.toString()}`);
    setSelectedCustomer(null);
  };

  const handleOpenCreateForm = () => {
    setIsFormOpen(true);
  };

  return (
    <div className="space-y-6 px-4 sm:px-6 py-1 sm:py-2">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <Card>
          <CardContent className="p-3 sm:p-4">
            <div className="flex flex-col items-center text-center gap-1.5 sm:flex-row sm:text-left sm:gap-3">
              <div className="w-9 h-9 sm:w-10 sm:h-10 bg-muted rounded-lg flex items-center justify-center shrink-0">
                <Users className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground" />
              </div>
              <div className="min-w-0">
                <p className="text-xs sm:text-sm text-muted-foreground whitespace-nowrap">전체 고객</p>
                <p className="text-lg sm:text-xl font-bold text-foreground tabular-nums">{stats.total}<span className="text-sm font-medium">명</span></p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 sm:p-4">
            <div className="flex flex-col items-center text-center gap-1.5 sm:flex-row sm:text-left sm:gap-3">
              <div className="w-9 h-9 sm:w-10 sm:h-10 bg-muted rounded-lg flex items-center justify-center shrink-0">
                <span className="text-base sm:text-lg">🌟</span>
              </div>
              <div className="min-w-0">
                <p className="text-xs sm:text-sm text-muted-foreground whitespace-nowrap">단골/VIP</p>
                <p className="text-lg sm:text-xl font-bold text-foreground tabular-nums">{stats.regularVip}<span className="text-sm font-medium">명</span></p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 sm:p-4">
            <div className="flex flex-col items-center text-center gap-1.5 sm:flex-row sm:text-left sm:gap-3">
              <div className="w-9 h-9 sm:w-10 sm:h-10 bg-muted rounded-lg flex items-center justify-center shrink-0">
                <CalendarDays className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground" />
              </div>
              <div className="min-w-0">
                <p className="text-xs sm:text-sm text-muted-foreground whitespace-nowrap">최근 30일</p>
                <p className="text-lg sm:text-xl font-bold text-foreground tabular-nums">{stats.recentBuyers}<span className="text-sm font-medium">명</span></p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 등급 필터 칩 */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setGradeFilter('all')}
          className={cn(
            'px-3 py-1.5 rounded-full text-xs font-medium',
            gradeFilter === 'all' ? 'bg-brand text-white' : 'bg-muted text-muted-foreground hover:bg-muted/70',
          )}
          aria-pressed={gradeFilter === 'all'}
        >
          전체
        </button>
        {initialGrades.map((g) => (
          <button
            key={g.id}
            type="button"
            onClick={() => setGradeFilter(g.name)}
            className={cn(
              'px-3 py-1.5 rounded-full text-xs font-medium',
              gradeFilter === g.name ? 'bg-brand text-white' : 'bg-muted text-muted-foreground hover:bg-muted/70',
            )}
            aria-pressed={gradeFilter === g.name}
          >
            {g.name}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <Select value={genderFilter} onValueChange={(v) => setGenderFilter(v as GenderFilter)}>
          <SelectTrigger className="w-[110px] bg-background">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">전체 성별</SelectItem>
            <SelectItem value="male">남성</SelectItem>
            <SelectItem value="female">여성</SelectItem>
          </SelectContent>
        </Select>
        <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortBy)}>
          <SelectTrigger className="w-[140px] bg-background">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="recent">최근 구매순</SelectItem>
            <SelectItem value="newest">최신 등록순</SelectItem>
            <SelectItem value="oldest">오래된순</SelectItem>
            <SelectItem value="name">가나다순</SelectItem>
            <SelectItem value="purchase_count">구매횟수순</SelectItem>
            <SelectItem value="purchase_amount">구매금액순</SelectItem>
          </SelectContent>
        </Select>
        <div className="relative flex-1 min-w-[180px] max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="이름/연락처 검색..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-background"
            aria-label="고객 검색"
          />
        </div>
        <p className="text-sm text-muted-foreground ml-auto shrink-0">
          {filteredCustomers.length}명{filteredCustomers.length !== optimisticCustomers.length && ` / 전체 ${optimisticCustomers.length}명`}
        </p>
      </div>

      {/* Customer Card Grid */}
      {filteredCustomers.length === 0 ? (
        <Card className="p-12 text-center">
          {hasActiveFilters ? (
            <div className="flex flex-col items-center gap-2 text-muted-foreground">
              <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center">
                <Search className="w-6 h-6 text-muted-foreground" />
              </div>
              <p>선택한 필터에 맞는 고객이 없습니다</p>
              <Button variant="outline" size="sm" onClick={resetFilters}>
                필터 초기화
              </Button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2 text-muted-foreground">
              <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center">
                <Users className="w-6 h-6 text-muted-foreground" />
              </div>
              <p>등록된 고객이 없습니다</p>
              <Button variant="outline" size="sm" onClick={handleOpenCreateForm}>
                첫 고객 등록하기
              </Button>
            </div>
          )}
        </Card>
      ) : (
        // 통합 그리드 (등급 그룹핑 없음)
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredCustomers.map((customer) => (
            <CustomerCard
              key={customer.id}
              customer={customer}
              onSelect={handleSelectCustomer}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {/* Create/Edit Form Dialog */}
      <CustomerFormDialog
        open={isFormOpen || !!editingCustomer}
        onOpenChange={(open) => {
          if (!open) {
            setIsFormOpen(false);
            setEditingCustomer(null);
          }
        }}
        customer={editingCustomer}
        grades={initialGrades}
        onSuccess={handleFormSuccess}
      />

      {/* Customer Detail Dialog */}
      <CustomerDetailDialog
        customer={selectedCustomer}
        sales={customerSales}
        isLoadingSales={isLoadingSales}
        isLoadingMore={isLoadingMoreSales}
        hasMore={hasMoreSales}
        onLoadMore={handleLoadMoreSales}
        onClose={() => setSelectedCustomer(null)}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onSaleRegister={handleSaleRegister}
      />

      {/* Delete Confirm Dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>고객 삭제</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-muted-foreground text-sm">
              <span className="font-medium text-foreground">{deleteTarget?.name}</span> 고객을 삭제하시겠습니까?
            </p>
            <p className="text-muted-foreground text-xs mt-2">연결된 매출 기록은 유지됩니다.</p>
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

      {/* 등급 관리 모달 */}
      <CustomerGradesModal
        open={isGradesOpen}
        onOpenChange={setIsGradesOpen}
        onChanged={handleGradesChanged}
      />

      {/* FAB — Speed Dial */}
      <div className="fixed bottom-20 right-4 lg:bottom-6 lg:right-6 z-40 flex flex-col items-end gap-2">
        {fabOpen && (
          <div className="flex flex-col items-end gap-2 animate-in fade-in slide-in-from-bottom-2 duration-200">
            <button
              type="button"
              onClick={() => { setFabOpen(false); handleOpenCreateForm(); }}
              className="flex items-center gap-2 h-10 pr-4 pl-3 rounded-full bg-brand text-white text-sm font-medium shadow-lg"
            >
              <UserPlus className="w-4 h-4" />
              고객 등록
            </button>
            <ExportButton
              getExportConfig={getExportConfig}
              className="flex items-center gap-2 h-10 pr-4 pl-3 rounded-full bg-foreground text-background text-sm font-medium shadow-lg"
            />
            <button
              type="button"
              onClick={() => { setFabOpen(false); setIsGradesOpen(true); }}
              className="flex items-center gap-2 h-10 pr-4 pl-3 rounded-full bg-foreground text-background text-sm font-medium shadow-lg"
            >
              <Settings className="w-4 h-4" />
              등급 관리
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
