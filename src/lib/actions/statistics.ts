'use server';

import {withErrorLogging} from '@/lib/errors';
import {apiFetch} from '@/lib/api/client';

// ─── BFF /statistics/* 응답 DTO 미러 (camelCase, 서버가 그대로 반환 → 재매핑 불필요) ─

export interface DistributionItem {
  id: number | null;
  label: string;
  amount: number;
  count: number;
  percentage: number;
}

export interface SalesStatistics {
  kpi: {
    totalAmount: number;
    totalAmountDeltaPct: number;
    count: number;
    countDelta: number;
    avgOrderValue: number;
    avgOrderValueDeltaPct: number;
    unpaidBalance: number;
    unpaidCount: number;
  };
  timeseries: { date: string; amount: number; count: number }[];
  categoryDistribution: DistributionItem[];
  paymentDistribution: DistributionItem[];
  channelDistribution: DistributionItem[];
}

export interface ExpensesStatistics {
  kpi: {
    totalAmount: number;
    totalAmountDeltaPct: number;
    count: number;
    countDelta: number;
    expenseRatioPct: number;
    netProfit: number;
    netProfitDeltaPct: number;
  };
  timeseries: { date: string; expense: number; netProfit: number }[];
  categoryDistribution: DistributionItem[];
}

export interface ReservationStatistics {
  kpi: {
    total: number;
    totalDeltaPct: number;
    dailyAvg: number;
    busiestDow: number;
    busiestDowPct: number;
    peakHourBucket: string;
    peakHourPct: number;
  };
  timeseries: { date: string; count: number }[];
  heatmap: { dow: number; hourBucket: string; count: number }[];
  dowDistribution: { dow: number; count: number }[];
  hourDistribution: { hourBucket: string; count: number }[];
}

export interface CustomerStatistics {
  kpi: {
    total: number;
    newCustomers: number;
    newDelta: number;
    returningCustomers: number;
    returningDelta: number;
    returningRatePct: number;
  };
  timeseries: { date: string; newCustomers: number }[];
  gradeDistribution: { grade: string; count: number }[];
  genderDistribution: { gender: string | null; count: number }[];
  topCustomers: {
    customerId: number | null;
    name: string;
    phone: string;
    grade: string;
    purchaseCount: number;
    totalAmount: number;
  }[];
}

// ─── Server Actions ──────────────────────────────────────────
// BFF가 camelCase 응답을 그대로 반환하므로 필드 재매핑 없이 apiFetch 결과를 그대로 돌려준다.
// 테넌트 격리는 BFF가 JWT(TenantContext) 기준으로 수행한다.

async function _getSalesStatistics(from: string, to: string): Promise<SalesStatistics> {
  return apiFetch<SalesStatistics>(`/statistics/sales?from=${from}&to=${to}`);
}

export const getSalesStatistics = withErrorLogging('getSalesStatistics', _getSalesStatistics);

async function _getExpensesStatistics(from: string, to: string): Promise<ExpensesStatistics> {
  return apiFetch<ExpensesStatistics>(`/statistics/expenses?from=${from}&to=${to}`);
}

export const getExpensesStatistics = withErrorLogging('getExpensesStatistics', _getExpensesStatistics);

async function _getReservationStatistics(from: string, to: string): Promise<ReservationStatistics> {
  return apiFetch<ReservationStatistics>(`/statistics/reservations?from=${from}&to=${to}`);
}

export const getReservationStatistics = withErrorLogging('getReservationStatistics', _getReservationStatistics);

async function _getCustomerStatistics(from: string, to: string): Promise<CustomerStatistics> {
  return apiFetch<CustomerStatistics>(`/statistics/customers?from=${from}&to=${to}`);
}

export const getCustomerStatistics = withErrorLogging('getCustomerStatistics', _getCustomerStatistics);

// ─── 레거시 타입 shim (B5–B10에서 대시보드 월간 분석 섹션 제거 시 함께 삭제 예정) ──
// dashboard.ts(DashboardMonthData)·dashboard-client.tsx가 아직 이 타입들을 참조한다.
// 'use server' 파일은 값/타입 모두 비동기 함수 형태가 아니어도 type export는 허용된다.

export interface CategoryStat {
  categoryId: string | null;
  label: string;
  count: number;
  amount: number;
  percentage: number;
}

export interface PaymentMethodStat {
  paymentMethodId: string | null;
  label: string;
  count: number;
  amount: number;
  percentage: number;
}

export interface ChannelStat {
  channelId: string | null;
  label: string;
  count: number;
  amount: number;
  percentage: number;
}

export interface CustomerStat {
  newCustomers: number;
  returningCustomers: number;
  totalCustomers: number;
}

export interface ExpenseCategoryStat {
  categoryId: string | null;
  label: string;
  amount: number;
  percentage: number;
}
