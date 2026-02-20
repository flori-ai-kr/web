import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import type { Sale, PaymentMethod, ProductCategory } from "@/types/database"

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

export function filterSalesByCategory(sales: Sale[], category: ProductCategory | 'all'): Sale[] {
  if (category === 'all') return sales;
  return sales.filter(sale => sale.product_category === category);
}

export interface SalesSummary {
  total: number;
  card: number;
  naverpay: number;
  transfer: number;
  cash: number;
  count: number;
}

export function calculateSalesSummary(sales: Sale[]): SalesSummary {
  return sales.reduce((acc, sale) => {
    acc.total += sale.amount;
    acc.count += 1;
    
    switch (sale.payment_method) {
      case 'card':
        acc.card += sale.amount;
        break;
      case 'naverpay':
        acc.naverpay += sale.amount;
        break;
      case 'transfer':
        acc.transfer += sale.amount;
        break;
      case 'cash':
        acc.cash += sale.amount;
        break;
    }
    
    return acc;
  }, { total: 0, card: 0, naverpay: 0, transfer: 0, cash: 0, count: 0 });
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
