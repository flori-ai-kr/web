'use server';

import {requireAuth} from '@/lib/auth-guard';
import type {
    ExpenseCategory,
    PaymentMethod,
    Reservation,
    ReservationChannel,
    ReservationStatus,
    Sale,
} from '@/types/database';
import type {CategoryStat, ChannelStat, CustomerStat, ExpenseCategoryStat, PaymentMethodStat,} from './statistics';
import {withErrorLogging} from '@/lib/errors';
import {apiFetch} from '@/lib/api/client';

export interface DashboardSummary {
  totalAmount: number;
  cardAmount: number;
  cashAmount: number;
  transferAmount: number;
  naverpayAmount: number;
  kakaopayAmount: number;
}

// ─── Kotlin DTO 미러 (camelCase) ──────────────────────────
// 서버 계약과 1:1. 멀티테넌시는 서버 JWT(TenantContext)가 처리.

interface KotlinDashboardSummary {
  totalAmount: number;
  cardAmount: number;
  cashAmount: number;
  transferAmount: number;
  naverpayAmount: number;
  kakaopayAmount: number;
  pendingCount: number;
  pendingAmount: number;
}

interface KotlinSale {
  id: string;
  date: string;
  productName: string;
  productCategory: string | null;
  amount: number;
  paymentMethod: string;
  cardCompany: string | null;
  fee: number | null;
  expectedDeposit: number | null;
  expectedDepositDate: string | null;
  depositStatus: string;
  depositedAt: string | null;
  reservationChannel: string;
  customerName: string | null;
  customerPhone: string | null;
  customerId: string | null;
  memo: string | null;
  isUnpaid: boolean;
  hasReview: boolean;
  createdAt: string;
  updatedAt: string;
}

interface KotlinReservation {
  id: string;
  date: string;
  time: string | null;
  customerName: string;
  customerPhone: string | null;
  title: string;
  memo: string | null;
  status: string;
  saleId: string | null;
  amount: number;
  reminderAt: string | null;
  reminderSent: boolean;
  pickupCompleted: boolean;
  createdAt: string;
  updatedAt: string;
}

interface KotlinCategoryOption {
  value: string;
  label: string;
}

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

interface KotlinTodayDashboard {
  summary: KotlinDashboardSummary;
  upcomingReservations: KotlinReservation[];
  triggeredReminders: KotlinReservation[];
  recentSales: KotlinSale[];
  saleCategories: KotlinCategoryOption[];
}

interface KotlinMonthDashboard {
  summary: KotlinDashboardSummary;
  expenseTotal: number;
  categoryStats: KotlinCategoryStat[];
  paymentStats: KotlinPaymentMethodStat[];
  channelStats: KotlinChannelStat[];
  customerStats: KotlinCustomerStat;
  expenseStats: KotlinExpenseCategoryStat[];
}

function mapSummary(s: KotlinDashboardSummary): DashboardSummary {
  return {
    totalAmount: s.totalAmount,
    cardAmount: s.cardAmount,
    cashAmount: s.cashAmount,
    transferAmount: s.transferAmount,
    naverpayAmount: s.naverpayAmount,
    kakaopayAmount: s.kakaopayAmount,
  };
}

// photos는 Kotlin /dashboard가 반환하지 않으므로 undefined.
function mapSale(s: KotlinSale): Sale {
  return {
    id: s.id,
    user_id: '',
    date: s.date,
    product_name: s.productName,
    product_category: s.productCategory ?? s.productName,
    amount: s.amount,
    payment_method: s.paymentMethod as PaymentMethod,
    reservation_channel: s.reservationChannel as ReservationChannel,
    customer_name: s.customerName ?? undefined,
    customer_phone: s.customerPhone ?? undefined,
    customer_id: s.customerId ?? undefined,
    memo: s.memo ?? undefined,
    is_unpaid: s.isUnpaid,
    has_review: s.hasReview,
    photos: undefined,
    created_at: s.createdAt,
    updated_at: s.updatedAt,
  };
}

function mapReservation(r: KotlinReservation): Reservation {
  return {
    id: r.id,
    user_id: '',
    date: r.date,
    time: r.time ?? null,
    customer_name: r.customerName,
    customer_phone: r.customerPhone ?? null,
    title: r.title,
    memo: r.memo ?? null,
    status: r.status as ReservationStatus,
    sale_id: r.saleId ?? null,
    amount: r.amount,
    reminder_at: r.reminderAt ?? null,
    reminder_sent: r.reminderSent,
    pickup_completed: r.pickupCompleted,
    created_at: r.createdAt,
    updated_at: r.updatedAt,
  };
}

function mapCategoryStats(stats: KotlinCategoryStat[]): CategoryStat[] {
  return stats.map((st) => ({
    name: st.name,
    count: st.count,
    amount: st.amount,
    percentage: st.percentage,
  }));
}

function mapPaymentStats(stats: KotlinPaymentMethodStat[]): PaymentMethodStat[] {
  return stats.map((st) => ({
    method: st.method as PaymentMethod,
    label: st.label,
    count: st.count,
    amount: st.amount,
    percentage: st.percentage,
  }));
}

function mapChannelStats(stats: KotlinChannelStat[]): ChannelStat[] {
  return stats.map((st) => ({
    channel: st.channel as ReservationChannel,
    label: st.label,
    count: st.count,
    amount: st.amount,
    percentage: st.percentage,
  }));
}

function mapExpenseStats(stats: KotlinExpenseCategoryStat[]): ExpenseCategoryStat[] {
  return stats.map((st) => ({
    category: st.category as ExpenseCategory,
    label: st.label,
    amount: st.amount,
    percentage: st.percentage,
  }));
}

function mapCustomerStats(s: KotlinCustomerStat): CustomerStat {
  return {
    newCustomers: s.newCustomers,
    returningCustomers: s.returningCustomers,
    totalCustomers: s.totalCustomers,
  };
}

async function _getTodaySummary(): Promise<DashboardSummary> {
  await requireAuth();
  const data = await apiFetch<KotlinTodayDashboard>('/dashboard/today');
  return mapSummary(data.summary);
}

export const getTodaySummary = withErrorLogging('getTodaySummary', _getTodaySummary);


async function _getRecentSales(limit: number = 10): Promise<Sale[]> {
  await requireAuth();
  // /dashboard/today는 최근 매출 5건을 반환한다. limit이 5를 초과해도 서버가 5건만 제공.
  const data = await apiFetch<KotlinTodayDashboard>('/dashboard/today');
  return data.recentSales.slice(0, limit).map(mapSale);
}

export const getRecentSales = withErrorLogging('getRecentSales', _getRecentSales);

async function _getMonthSummary(month?: string): Promise<DashboardSummary> {
  await requireAuth();
  const params = new URLSearchParams();
  if (month) params.set('month', month);
  const data = await apiFetch<KotlinMonthDashboard>(`/dashboard/month?${params.toString()}`);
  return mapSummary(data.summary);
}

export const getMonthSummary = withErrorLogging('getMonthSummary', _getMonthSummary);

// --- 통합 액션 (대시보드 성능 최적화) ---

export interface DashboardTodayData {
  summary: DashboardSummary;
  reservations: Reservation[];
  recentSales: Sale[];
  saleCategories: { value: string; label: string }[];
}

/** 오늘 대시보드 데이터를 단일 Server Action으로 조회 (Kotlin /dashboard/today) */
async function _getDashboardTodayData(): Promise<DashboardTodayData> {
  await requireAuth();
  const data = await apiFetch<KotlinTodayDashboard>('/dashboard/today');

  // 기존 동작: 오늘 이후 비취소 예약 전체를 클라이언트에서 재필터.
  // 서버의 upcomingReservations + triggeredReminders를 id 기준 dedup해 합친다.
  const reservationMap = new Map<string, Reservation>();
  for (const r of [...data.upcomingReservations, ...data.triggeredReminders]) {
    reservationMap.set(r.id, mapReservation(r));
  }
  const reservations = Array.from(reservationMap.values()).sort((a, b) => {
    if (a.date !== b.date) return a.date.localeCompare(b.date);
    return (a.time ?? '').localeCompare(b.time ?? '');
  });

  return {
    summary: mapSummary(data.summary),
    reservations,
    recentSales: data.recentSales.map(mapSale),
    saleCategories: data.saleCategories.map((c) => ({ value: c.value, label: c.label })),
  };
}

export const getDashboardTodayData = withErrorLogging('getDashboardTodayData', _getDashboardTodayData);

export interface DashboardMonthData {
  summary: DashboardSummary;
  expenseTotal: number;
  categoryStats: CategoryStat[];
  paymentStats: PaymentMethodStat[];
  channelStats: ChannelStat[];
  customerStats: CustomerStat;
  expenseStats: ExpenseCategoryStat[];
}

/** 월별 대시보드 데이터를 단일 Server Action으로 조회 (Kotlin /dashboard/month) */
async function _getDashboardMonthData(month?: string): Promise<DashboardMonthData> {
  await requireAuth();
  const params = new URLSearchParams();
  if (month) params.set('month', month);
  const data = await apiFetch<KotlinMonthDashboard>(`/dashboard/month?${params.toString()}`);

  return {
    summary: mapSummary(data.summary),
    expenseTotal: data.expenseTotal,
    categoryStats: mapCategoryStats(data.categoryStats),
    paymentStats: mapPaymentStats(data.paymentStats),
    channelStats: mapChannelStats(data.channelStats),
    customerStats: mapCustomerStats(data.customerStats),
    expenseStats: mapExpenseStats(data.expenseStats),
  };
}

export const getDashboardMonthData = withErrorLogging('getDashboardMonthData', _getDashboardMonthData);
