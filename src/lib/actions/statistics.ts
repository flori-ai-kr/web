'use server';

import {requireAuth} from '@/lib/auth-guard';
import type {ExpenseCategory, PaymentMethod, ReservationChannel} from '@/types/database';
import {withErrorLogging} from '@/lib/errors';
import {apiFetch} from '@/lib/api/client';

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
// month 미지정 시 서버는 "이번 달"을 집계한다(서버 기본값).

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
