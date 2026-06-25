'use client';

import {useCallback, useState} from 'react';
import {useRouter} from 'next/navigation';
import {Button} from '@/components/ui/button';
import {Card} from '@/components/ui/card';
import {Search, Users} from 'lucide-react';
import type {Customer, CustomerGradeConfig} from '@/types/database';
import {type ExportConfig, exportPeriodLabels} from '@/lib/export';
import type {SaleCategory} from '@/lib/actions/sale-settings';
import {PeriodHeader} from '@/components/layout/period-header';
import {CustomerCard, genderLabels} from './components/customer-card';
import {CustomerFormDialog} from './components/customer-form-dialog';
import {CustomerDetailDialog} from './components/customer-detail-dialog';
import {CustomerGradesModal} from './components/customer-grades-modal';
import {CustomerDeleteDialog} from './components/customer-delete-dialog';
import {CustomerFab} from './components/customer-fab';
import {CustomersFilters} from './components/customers-filters';
import {useCustomerFilters} from './hooks/use-customer-filters';
import {useCustomerDetail} from './hooks/use-customer-detail';
import {useCustomerDelete} from './hooks/use-customer-delete';

interface Props {
  initialCustomers: Customer[];
  initialCategories: SaleCategory[];
  initialGrades: CustomerGradeConfig[];
}

export function CustomersClient({ initialCustomers, initialGrades }: Props) {
  const router = useRouter();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [isGradesOpen, setIsGradesOpen] = useState(false);
  const {
    selectedCustomer,
    setSelectedCustomer,
    customerSales,
    isLoadingSales,
    isLoadingMoreSales,
    hasMoreSales,
    handleSelectCustomer,
    handleLoadMoreSales,
  } = useCustomerDetail({ initialCustomers });
  const {
    optimisticCustomers,
    deleteTarget,
    setDeleteTarget,
    handleDelete,
    confirmDelete,
  } = useCustomerDelete({
    initialCustomers,
    onCloseDetail: () => setSelectedCustomer(null),
  });

  const filters = useCustomerFilters({ customers: optimisticCustomers, grades: initialGrades });
  const { filteredCustomers, groupedCustomers, isSearching, headerStats, hasActiveFilters, resetFilters } = filters;

  const getExportConfig = useCallback((): ExportConfig<Customer> => {
    const { fileSuffix, rangeLabel } = exportPeriodLabels(
      filters.customRange
        ? { range: { startDate: filters.customRange.start, endDate: filters.customRange.end } }
        : { year: filters.periodYear, month: filters.periodMonth },
    );
    // 등급 높은 순 정렬 — 등급별 그룹(임계값 높은 순)을 평탄화. 특정 등급 필터 중이면 그 그룹만.
    const gradeSorted = groupedCustomers ? groupedCustomers.flatMap(g => g.customers) : filteredCustomers;
    return {
      filename: `고객${fileSuffix}`,
      title: `고객 목록 (${rangeLabel})`,
      columns: [
        { header: '이름', accessor: (c) => String(c.name || '') },
        { header: '연락처', accessor: (c) => String(c.phone || '') },
        { header: '등급', accessor: (c) => c.grade || '' },
        { header: '성별', accessor: (c) => c.gender ? genderLabels[c.gender] || '' : '' },
        { header: '구매횟수', accessor: (c) => Number(c.total_purchase_count) || 0 },
        { header: '총구매금액', accessor: (c) => Number(c.total_purchase_amount) || 0, format: 'currency' },
        { header: '최근구매일', accessor: (c) => String(c.last_purchase_date || '') },
        { header: '메모', accessor: (c) => String(c.memo || '') },
      ],
      data: gradeSorted,
    };
  }, [filteredCustomers, groupedCustomers, filters.customRange, filters.periodYear, filters.periodMonth]);

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
        periodYear={filters.periodYear}
        periodMonth={filters.periodMonth}
        customRange={filters.customRange}
        onMonthNav={filters.handleMonthNav}
        onMonthSelect={filters.handleMonthSelect}
        onRangeApply={filters.handleRangeApply}
        onRangeReset={() => filters.setCustomRange(null)}
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
      <CustomersFilters filters={filters} grades={initialGrades} />

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
      <CustomerDeleteDialog
        target={deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
      />

      {/* 등급 관리 모달 */}
      <CustomerGradesModal
        open={isGradesOpen}
        onOpenChange={setIsGradesOpen}
        onChanged={handleGradesChanged}
      />

      {/* FAB — Speed Dial */}
      <CustomerFab
        onOpenForm={handleOpenCreateForm}
        onOpenGrades={() => setIsGradesOpen(true)}
        getExportConfig={getExportConfig}
      />
    </div>
  );
}
