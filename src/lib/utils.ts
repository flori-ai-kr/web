import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import type { Sale } from "@/types/database"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Amount formatting utilities
export function formatAmountInput(value: number | string): string {
  const numericValue = typeof value === 'string' ? parseAmountInput(value) : value;
  if (isNaN(numericValue) || numericValue === 0) return '';
  return numericValue.toLocaleString('ko-KR');
}

export function parseAmountInput(value: string): number {
  const numericString = value.replace(/[^0-9]/g, '');
  return numericString ? parseInt(numericString, 10) : 0;
}

export function filterNumericInput(value: string): string {
  return value.replace(/[^0-9]/g, '');
}

// Sales filtering utilities
export function filterSalesByYearMonth(sales: Sale[], year: number, month: number): Sale[] {
  return sales.filter(sale => {
    const saleDate = new Date(sale.date);
    return saleDate.getFullYear() === year && saleDate.getMonth() + 1 === month;
  });
}

export interface SalesSummary {
  total: number;
  card: number;
  naverpay: number;
  transfer: number;
  cash: number;
  count: number;
}

// 통화 포맷팅 (₩1,000,000 형태)
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('ko-KR', {
    style: 'currency',
    currency: 'KRW',
    maximumFractionDigits: 0,
  }).format(amount);
}

// KST(UTC+9) 기준 오늘 날짜 (yyyy-MM-dd)
export function getTodayKST(): string {
  return new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().split('T')[0];
}

// KST 기준 현재 연/월 (yyyy-MM)
export function getCurrentMonthKST(): string {
  return getTodayKST().slice(0, 7);
}

// 월 기준 시작일/종료일 계산 (Server Action에서 공통 사용)
export function getMonthDateRange(month?: string): { startDate: string; endDate: string } {
  const target = month || getCurrentMonthKST();
  const [year, m] = target.split('-').map(Number);
  return {
    startDate: `${year}-${String(m).padStart(2, '0')}-01`,
    endDate: `${year}-${String(m).padStart(2, '0')}-${new Date(year, m, 0).getDate()}`,
  };
}

// 전화번호 포맷팅 (010-1234-5678 형태)
export function formatPhoneNumber(value: string): string {
  const numbers = value.replace(/[^0-9]/g, '');
  
  if (numbers.length <= 3) {
    return numbers;
  } else if (numbers.length <= 7) {
    return `${numbers.slice(0, 3)}-${numbers.slice(3)}`;
  } else {
    return `${numbers.slice(0, 3)}-${numbers.slice(3, 7)}-${numbers.slice(7, 11)}`;
  }
}

/**
 * 집계 금액을 만원 단위로 표시.
 * 예: 6,420,000 → "642만원", 9,000 → "₩9,000" (1만 미만은 원 단위 그대로)
 */
export function formatManwon(n: number): string {
  if (n < 10000) {
    return `₩${n.toLocaleString('ko-KR')}`;
  }
  const manwon = Math.round(n / 10000);
  return `${manwon.toLocaleString('ko-KR')}만원`;
}

/**
 * 아직 입금 안 된 미수(외상)인지 판정.
 * `is_unpaid`는 '외상이었음'을 나타내는 영구 마커라(결제 완료해도 BFF가 유지),
 * 실제 '미수(아직 안 받음)'는 결제수단이 아직 안 정해진(payment_method_id == null) 경우만이다.
 */
export function isUnsettledUnpaid(sale: { is_unpaid?: boolean; payment_method_id?: string | null }): boolean {
  return !!sale.is_unpaid && !sale.payment_method_id;
}

/**
 * 문자열 배열을 빈도순(내림차순)으로 정렬하여 중복 제거된 배열 반환
 */
export function sortByFrequency(values: string[]): string[] {
  const counts = new Map<string, number>();
  for (const v of values) {
    counts.set(v, (counts.get(v) || 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([value]) => value);
}
