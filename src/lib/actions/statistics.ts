'use server';

import {requireAuth} from '@/lib/auth-guard';
import {withErrorLogging} from '@/lib/errors';
import {apiFetch} from '@/lib/api/client';

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

// ─── Kotlin /dashboard/month DTO 미러 (camelCase) ──────────
// 개별 통계 함수는 Kotlin /dashboard/month 의 집계 결과에서 해당 차원만 추출한다.
// month 미지정 시 서버는 "이번 달"을 집계한다(서버 기본값).

interface KotlinCategoryStat {
  categoryId: number | string | null;
  label: string;
  count: number;
  amount: number;
  percentage: number;
}

interface KotlinPaymentMethodStat {
  paymentMethodId: number | string | null;
  label: string;
  count: number;
  amount: number;
  percentage: number;
}

interface KotlinChannelStat {
  channelId: number | string | null;
  label: string;
  count: number;
  amount: number;
  percentage: number;
}

interface KotlinExpenseCategoryStat {
  categoryId: number | string | null;
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
    categoryId: st.categoryId != null ? String(st.categoryId) : null,
    label: st.label,
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
    paymentMethodId: st.paymentMethodId != null ? String(st.paymentMethodId) : null,
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
    channelId: st.channelId != null ? String(st.channelId) : null,
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
    categoryId: st.categoryId != null ? String(st.categoryId) : null,
    label: st.label,
    amount: st.amount,
    percentage: st.percentage,
  }));
}

export const getExpenseCategoryStats = withErrorLogging('getExpenseCategoryStats', _getExpenseCategoryStats);
