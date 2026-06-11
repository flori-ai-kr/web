'use client';

import {useCallback, useEffect, useMemo, useOptimistic, useState, useTransition} from 'react';
import {useRouter, useSearchParams} from 'next/navigation';
import {Button} from '@/components/ui/button';
import {Card} from '@/components/ui/card';
import {Input} from '@/components/ui/input';
import {Dialog, DialogContent, DialogHeader, DialogTitle} from '@/components/ui/dialog';
import {Plus, RotateCcw, Search, Settings, UserPlus, Users} from 'lucide-react';
import {format} from 'date-fns';
import {toast} from 'sonner';
import {deleteCustomer, getCustomerById, getCustomerSales} from '@/lib/actions/customers';
import type {Customer, CustomerGradeConfig, Sale} from '@/types/database';
import {ExportButton} from '@/components/ui/export-button';
import type {ExportConfig} from '@/lib/export';
import type {SaleCategory} from '@/lib/actions/sale-settings';
import {PeriodHeader} from '@/components/layout/PeriodHeader';
import type {CustomRange} from '@/lib/period-range';
import {CustomerCard, genderLabels} from './components/CustomerCard';
import {FilterSelect} from './components/filter-select';
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

export function CustomersClient({ initialCustomers, initialGrades }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [gradeFilter, setGradeFilter] = useState('all');
  const [genderFilter, setGenderFilter] = useState<GenderFilter>('all');
  const [sortBy, setSortBy] = useState<SortBy>('recent');
  const [searchQuery, setSearchQuery] = useState('');
  // 기간 헤더(최근 방문 시기 기준). 기본 = 이번 달.
  const now = new Date();
  const [periodYear, setPeriodYear] = useState(now.getFullYear());
  const [periodMonth, setPeriodMonth] = useState(now.getMonth() + 1);
  const [customRange, setCustomRange] = useState<CustomRange | null>(null);
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

  // 기간 매칭 — 최근 방문일(last_purchase_date) 기준. 단, 방문 기록이 없는 고객은
  // 등록일(created_at)로 대체해 '이 기간에 새로 등록한 고객'이 목록에서 사라지지 않게 한다.
  const matchesPeriod = useCallback((c: Customer) => {
    const ref = c.last_purchase_date ?? c.created_at;
    if (!ref) return false;
    const date = ref.slice(0, 10); // 'YYYY-MM-DD'
    if (customRange) {
      return customRange.start <= date && date <= customRange.end;
    }
    // 월 뷰: 연·월 비교
    const ym = `${periodYear}-${String(periodMonth).padStart(2, '0')}`;
    return date.slice(0, 7) === ym;
  }, [customRange, periodYear, periodMonth]);

  const filteredCustomers = useMemo(() => {
    const isSearching = searchQuery.trim() !== '';
    const filtered = optimisticCustomers
      .filter(c => gradeFilter === 'all' || c.grade_id === gradeFilter)
      .filter(c => genderFilter === 'all' || c.gender === genderFilter)
      // 검색어가 있으면 기간 필터를 무시하고 전체 고객에서 찾는다(이름/연락처로 항상 검색 가능).
      .filter(c => isSearching || matchesPeriod(c))
      .filter(c => {
        if (!isSearching) return true;
        const q = searchQuery.toLowerCase();
        const qDigits = q.replace(/-/g, '');
        return c.name.toLowerCase().includes(q)
          || c.phone.includes(q)
          || c.phone.replace(/-/g, '').includes(qDigits)
          || (c.memo?.toLowerCase().includes(q) ?? false);
      });
    return sortCustomers(filtered);
  }, [optimisticCustomers, gradeFilter, genderFilter, searchQuery, matchesPeriod, sortCustomers]);

  // 등급 표시 순서: 구매횟수 임계값 높은 등급 먼저(많이 온 순). 임계값 없는(수동전용) 등급은 맨 뒤.
  const gradeOrder = useMemo(() => {
    return [...initialGrades].sort((a, b) => {
      if (a.threshold == null && b.threshold == null) return a.sort_order - b.sort_order;
      if (a.threshold == null) return 1;
      if (b.threshold == null) return -1;
      return b.threshold - a.threshold;
    });
  }, [initialGrades]);

  // 전체 등급 보기일 때만 등급별 그룹핑(구분선). 특정 등급 필터 시엔 평면 그리드(null).
  const groupedCustomers = useMemo(() => {
    if (gradeFilter !== 'all') return null;
    const byGrade = new Map<string, typeof filteredCustomers>();
    for (const c of filteredCustomers) {
      const key = c.grade_id ?? '__none__';
      (byGrade.get(key) ?? byGrade.set(key, []).get(key)!).push(c);
    }
    const groups = gradeOrder
      .filter(g => byGrade.has(g.id))
      .map(g => ({ id: g.id, name: g.name, customers: byGrade.get(g.id)! }));
    if (byGrade.has('__none__')) {
      groups.push({ id: '__none__', name: '미지정', customers: byGrade.get('__none__')! });
    }
    return groups;
  }, [filteredCustomers, gradeFilter, gradeOrder]);

  // 헤더 보조 지표용 — 날짜 문자열이 활성 기간에 포함되는지(first_purchase_date 등에 사용).
  const inActivePeriod = useCallback((dateStr?: string | null) => {
    if (!dateStr) return false;
    const date = dateStr.slice(0, 10);
    if (customRange) return customRange.start <= date && date <= customRange.end;
    const ym = `${periodYear}-${String(periodMonth).padStart(2, '0')}`;
    return date.slice(0, 7) === ym;
  }, [customRange, periodYear, periodMonth]);

  const isSearching = searchQuery.trim() !== '';

  // 헤더: 큰 숫자 + 보조(신규/재방문/평균구매액). 기간 뷰 기준.
  const headerStats = useMemo(() => {
    const total = filteredCustomers.length;
    // 신규 = 이 기간에 '등록'한 고객(검색 모드에선 기간 개념이 없어 0).
    const newCount = isSearching
      ? 0
      : filteredCustomers.filter(c => inActivePeriod(c.created_at)).length;
    const revisit = total - newCount;
    const sum = filteredCustomers.reduce((s, c) => s + (c.total_purchase_amount || 0), 0);
    const avgManwon = total > 0 ? Math.round(sum / total / 10000) : 0;
    return { total, newCount, revisit, avgManwon };
  }, [filteredCustomers, isSearching, inActivePeriod]);

  const isDefaultPeriod = customRange === null
    && periodYear === now.getFullYear()
    && periodMonth === now.getMonth() + 1;
  const hasActiveFilters = gradeFilter !== 'all' || genderFilter !== 'all' || searchQuery !== '' || sortBy !== 'recent' || !isDefaultPeriod;

  const handleMonthNav = (direction: -1 | 1) => {
    setCustomRange(null);
    let y = periodYear;
    let m = periodMonth + direction;
    if (m < 1) { m = 12; y -= 1; }
    if (m > 12) { m = 1; y += 1; }
    setPeriodYear(y);
    setPeriodMonth(m);
  };

  const resetFilters = () => {
    setGradeFilter('all');
    setGenderFilter('all');
    setSearchQuery('');
    setSortBy('recent');
    setCustomRange(null);
    setPeriodYear(now.getFullYear());
    setPeriodMonth(now.getMonth() + 1);
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
      {/* 기간 헤더 — 매출 페이지와 동일한 월 네비 + 기간(최근 방문 기준) */}
      <PeriodHeader
        periodYear={periodYear}
        periodMonth={periodMonth}
        customRange={customRange}
        onMonthNav={handleMonthNav}
        onRangeApply={setCustomRange}
        onRangeReset={() => setCustomRange(null)}
      />

      {/* 헤더: 큰 숫자 + 보조 미니스탯 */}
      <div>
        <div className="flex items-baseline gap-3 flex-wrap">
          <p className="text-[28px] font-bold tracking-tight text-brand tabular-nums leading-none">
            {headerStats.total}<span className="text-base font-medium">명</span>
          </p>
          {headerStats.total > 0 && (
            <p className="text-xs text-muted-foreground tabular-nums">
              {!isSearching && (
                <>신규 <span className="font-semibold text-foreground">{headerStats.newCount}</span> · 재방문 <span className="font-semibold text-foreground">{headerStats.revisit}</span> · </>
              )}
              평균 <span className="font-semibold text-foreground">{headerStats.avgManwon}만</span>
            </p>
          )}
        </div>
      </div>

      {/* Filters — 데탑: 한 줄(드롭다운 + 검색 flex-1) / 모바일: 드롭다운 줄 + 검색 줄 */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-2">
        {/* 드롭다운 — 한 줄(넘치면 가로 스크롤) */}
        <div className="flex items-center gap-2 overflow-x-auto shrink-0">
          <FilterSelect
            label="등급"
            value={gradeFilter}
            defaultValue="all"
            options={[
              { value: 'all', label: '전체' },
              ...initialGrades.map((g) => ({ value: g.id, label: g.name })),
            ]}
            onChange={setGradeFilter}
          />
          <FilterSelect
            label="성별"
            value={genderFilter}
            defaultValue="all"
            options={[
              { value: 'all', label: '전체' },
              { value: 'male', label: '남성' },
              { value: 'female', label: '여성' },
            ]}
            onChange={(v) => setGenderFilter(v as GenderFilter)}
          />
          <FilterSelect
            label="정렬"
            value={sortBy}
            defaultValue="recent"
            options={[
              { value: 'recent', label: '최근 구매순' },
              { value: 'newest', label: '최신 등록순' },
              { value: 'oldest', label: '오래된순' },
              { value: 'name', label: '가나다순' },
              { value: 'purchase_count', label: '구매횟수순' },
              { value: 'purchase_amount', label: '구매금액순' },
            ]}
            onChange={(v) => setSortBy(v as SortBy)}
          />
        </div>
        {/* 검색 + 초기화 — 데탑에선 검색바 폭 제한(매출과 동일 220px) */}
        <div className="flex items-center gap-2 sm:flex-1 min-w-0">
          <div className="relative flex-1 sm:max-w-[220px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              placeholder="이름, 연락처, 메모 검색..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-8 text-sm bg-background rounded-full"
              aria-label="고객 검색"
            />
          </div>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={resetFilters}
              className="inline-flex items-center gap-1 h-8 px-3 rounded-md border border-border bg-card text-foreground text-xs font-medium shrink-0 hover:bg-muted transition-colors"
            >
              <RotateCcw className="w-3 h-3" />
              초기화
            </button>
          )}
        </div>
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
      ) : groupedCustomers ? (
        // 전체 보기: 등급별 그룹(임계값 높은 순) + 구분선
        <div className="space-y-6">
          {groupedCustomers.map((group) => (
            <div key={group.id} className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-foreground shrink-0">{group.name}</span>
                <span className="text-xs text-muted-foreground tabular-nums shrink-0">{group.customers.length}</span>
                <div className="flex-1 h-px bg-border" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {group.customers.map((customer) => (
                  <CustomerCard
                    key={customer.id}
                    customer={customer}
                    onSelect={handleSelectCustomer}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        // 특정 등급 필터: 평면 그리드
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
          aria-haspopup="menu"
          aria-expanded={fabOpen}
        >
          <Plus className="w-5 h-5 text-white" />
        </button>
      </div>
    </div>
  );
}
