'use server';

import { createClient } from '@/lib/supabase/server';
import { requireAuth } from '@/lib/auth-guard';
import type { PaymentMethod, ReservationChannel, ExpenseCategory } from '@/types/database';
import { withErrorLogging } from '@/lib/errors';
import { getMonthDateRange } from '@/lib/utils';
import { apiFetch } from '@/lib/api/client';

export interface CategoryStat {
  name: string;
  count: number;
  amount: number;
  percentage: number;
}

export interface PaymentMethodStat {
  method: PaymentMethod;
  label: string;
  count: number;
  amount: number;
  percentage: number;
}

export interface ChannelStat {
  channel: ReservationChannel;
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
  category: ExpenseCategory;
  label: string;
  amount: number;
  percentage: number;
}

// ─── Kotlin /dashboard/month DTO 미러 (camelCase) ──────────
// 개별 통계 함수는 Kotlin /dashboard/month 의 집계 결과에서 해당 차원만 추출한다.
// NOTE: month 미지정 시 기존 Supabase 구현은 전체 기간을 집계했으나
//   Kotlin /dashboard/month는 month 미지정 시 "이번 달"을 집계한다(서버 기본값).
//   현재 이 개별 함수들은 런타임 호출처가 없고 dashboard-client는 getDashboardMonthData만 사용한다.

interface KotlinCategoryStat {
  name: string;
  count: number;
  amount: number;
  percentage: number;
}

interface KotlinPaymentMethodStat {
  method: string;
  label: string;
  count: number;
  amount: number;
  percentage: number;
}

interface KotlinChannelStat {
  channel: string;
  label: string;
  count: number;
  amount: number;
  percentage: number;
}

interface KotlinExpenseCategoryStat {
  category: string;
  label: string;
  amount: number;
  percentage: number;
}

interface KotlinCustomerStat {
  totalCustomers: number;
  returningCustomers: number;
  newCustomers: number;
}

interface KotlinMonthDashboard {
  categoryStats: KotlinCategoryStat[];
  paymentStats: KotlinPaymentMethodStat[];
  channelStats: KotlinChannelStat[];
  customerStats: KotlinCustomerStat;
  expenseStats: KotlinExpenseCategoryStat[];
}

async function fetchMonthDashboard(month?: string): Promise<KotlinMonthDashboard> {
  const params = new URLSearchParams();
  if (month) params.set('month', month);
  return apiFetch<KotlinMonthDashboard>(`/dashboard/month?${params.toString()}`);
}

async function _getCategoryStats(month?: string): Promise<CategoryStat[]> {
  await requireAuth();
  const data = await fetchMonthDashboard(month);
  return data.categoryStats.map((st) => ({
    name: st.name,
    count: st.count,
    amount: st.amount,
    percentage: st.percentage,
  }));
}

export const getCategoryStats = withErrorLogging('getCategoryStats', _getCategoryStats);

async function _getPaymentMethodStats(month?: string): Promise<PaymentMethodStat[]> {
  await requireAuth();
  const data = await fetchMonthDashboard(month);
  return data.paymentStats.map((st) => ({
    method: st.method as PaymentMethod,
    label: st.label,
    count: st.count,
    amount: st.amount,
    percentage: st.percentage,
  }));
}

export const getPaymentMethodStats = withErrorLogging('getPaymentMethodStats', _getPaymentMethodStats);


async function _getChannelStats(month?: string): Promise<ChannelStat[]> {
  await requireAuth();
  const data = await fetchMonthDashboard(month);
  return data.channelStats.map((st) => ({
    channel: st.channel as ReservationChannel,
    label: st.label,
    count: st.count,
    amount: st.amount,
    percentage: st.percentage,
  }));
}

export const getChannelStats = withErrorLogging('getChannelStats', _getChannelStats);

async function _getCustomerStats(month?: string): Promise<CustomerStat> {
  await requireAuth();
  const data = await fetchMonthDashboard(month);
  return {
    newCustomers: data.customerStats.newCustomers,
    returningCustomers: data.customerStats.returningCustomers,
    totalCustomers: data.customerStats.totalCustomers,
  };
}

export const getCustomerStats = withErrorLogging('getCustomerStats', _getCustomerStats);


async function _getExpenseCategoryStats(month?: string): Promise<ExpenseCategoryStat[]> {
  await requireAuth();
  const data = await fetchMonthDashboard(month);
  return data.expenseStats.map((st) => ({
    category: st.category as ExpenseCategory,
    label: st.label,
    amount: st.amount,
    percentage: st.percentage,
  }));
}

export const getExpenseCategoryStats = withErrorLogging('getExpenseCategoryStats', _getExpenseCategoryStats);

export interface MonthlySalesTrend {
  month: string;
  label: string;
  totalAmount: number;
  salesCount: number;
}

async function _getMonthlySalesTrend(months: number = 6): Promise<MonthlySalesTrend[]> {
  // NOTE: Kotlin BFF에 다개월 매출 추이 엔드포인트가 없어 Supabase 유지.
  await requireAuth();
  const supabase = await createClient();
  const now = new Date();

  // 전체 기간을 단일 쿼리로 조회 (N+1 제거)
  const startMonth = new Date(now.getFullYear(), now.getMonth() - (months - 1), 1);
  const startDate = startMonth.toISOString().split('T')[0];
  const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];

  const { data, error } = await supabase
    .from('sales')
    .select('date, amount')
    .gte('date', startDate)
    .lte('date', endDate);

  if (error) throw error;

  // JS에서 월별 그룹핑
  const monthMap = new Map<string, { amount: number; count: number }>();
  (data || []).forEach((sale) => {
    const [year, m] = sale.date.split('-');
    const monthKey = `${year}-${m}`;
    const existing = monthMap.get(monthKey) || { amount: 0, count: 0 };
    existing.amount += sale.amount;
    existing.count += 1;
    monthMap.set(monthKey, existing);
  });

  const trends: MonthlySalesTrend[] = [];
  for (let i = months - 1; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    const label = `${date.getMonth() + 1}월`;
    const stats = monthMap.get(monthKey) || { amount: 0, count: 0 };
    trends.push({ month: monthKey, label, totalAmount: stats.amount, salesCount: stats.count });
  }

  return trends;
}

export const getMonthlySalesTrend = withErrorLogging('getMonthlySalesTrend', _getMonthlySalesTrend);

export interface DailySalesTrend {
  date: string;
  label: string;
  totalAmount: number;
  salesCount: number;
}

async function _getDailySalesTrend(month?: string): Promise<DailySalesTrend[]> {
  // NOTE: Kotlin BFF에 일별 매출 추이 엔드포인트가 없어 Supabase 유지.
  await requireAuth();
  const supabase = await createClient();
  const { startDate, endDate } = getMonthDateRange(month);

  const { data, error } = await supabase
    .from('sales')
    .select('date, amount')
    .gte('date', startDate)
    .lte('date', endDate)
    .order('date');

  if (error) throw error;

  const dailyMap = new Map<string, { amount: number; count: number }>();

  (data || []).forEach((sale) => {
    const existing = dailyMap.get(sale.date) || { amount: 0, count: 0 };
    existing.amount += sale.amount;
    existing.count += 1;
    dailyMap.set(sale.date, existing);
  });

  return Array.from(dailyMap.entries())
    .map(([date, stats]) => ({
      date,
      label: new Date(date).getDate() + '일',
      totalAmount: stats.amount,
      salesCount: stats.count,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

export const getDailySalesTrend = withErrorLogging('getDailySalesTrend', _getDailySalesTrend);
