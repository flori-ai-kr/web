import { describe, expect, it } from 'vitest';
import { mapKotlinSale, type KotlinSale } from '../sales';
import { mapKotlinReservation, mapKotlinSchedule, type KotlinReservation } from '../reservations';
import { mapKotlinExpense, mapKotlinRecurring, type KotlinExpense, type KotlinRecurringExpense } from '../expenses';
import { mapKotlinCustomer, type KotlinCustomer } from '../customers';

const baseSale: KotlinSale = {
  id: '1',
  date: '2026-06-11',
  categoryId: 11,
  categoryLabel: '꽃다발',
  amount: 50000,
  paymentMethodId: null,
  paymentMethodLabel: null,
  channelId: '21',
  channelLabel: '로드',
  customerName: null,
  customerPhone: null,
  customerId: null,
  memo: null,
  isUnpaid: true,
  hasReview: false,
  photos: null,
  createdAt: '2026-06-11T00:00:00Z',
  updatedAt: '2026-06-11T00:00:00Z',
};

describe('mapKotlinSale', () => {
  it('숫자/문자 id를 모두 문자열로 정규화하고 null은 유지한다', () => {
    const sale = mapKotlinSale(baseSale);
    expect(sale.category_id).toBe('11');
    expect(sale.channel_id).toBe('21');
    expect(sale.payment_method_id).toBeNull();
  });

  it('미수 마커(is_unpaid + payment_method_id null)를 보존한다', () => {
    const sale = mapKotlinSale(baseSale);
    expect(sale.is_unpaid).toBe(true);
    expect(sale.payment_method_id).toBeNull();
  });

  it('photos가 비거나 null이면 undefined, 있으면 그대로 매핑한다', () => {
    expect(mapKotlinSale(baseSale).photos).toBeUndefined();
    expect(mapKotlinSale({ ...baseSale, photos: [] }).photos).toBeUndefined();
    expect(mapKotlinSale({ ...baseSale, photos: ['u1'] }).photos).toEqual(['u1']);
  });
});

describe('mapKotlinReservation / mapKotlinSchedule', () => {
  const reservation: KotlinReservation = {
    id: 'r1',
    date: '2026-06-12',
    time: '14:00',
    customerName: '김민지',
    customerPhone: null,
    title: '결혼기념일 꽃다발',
    memo: null,
    status: 'confirmed',
    saleId: null,
    amount: 60000,
    reminderAt: null,
    reminderSent: false,
    pickupCompleted: false,
    createdAt: '2026-06-11T00:00:00Z',
    updatedAt: '2026-06-11T00:00:00Z',
  };

  it('조인 enrichment 필드가 없어도(대시보드 응답) 기본 필드를 매핑한다', () => {
    const r = mapKotlinReservation(reservation);
    expect(r.status).toBe('confirmed');
    expect(r.sale_id).toBeNull();
    expect(r.pickup_completed).toBe(false);
  });

  it('스케줄을 snake_case로 매핑한다', () => {
    const s = mapKotlinSchedule({
      id: 's1', title: '꽃시장 휴무', startDate: '2026-06-14', endDate: '2026-06-15',
      color: '#f43f5e', memo: null, createdAt: 'c', updatedAt: 'u',
    });
    expect(s.start_date).toBe('2026-06-14');
    expect(s.end_date).toBe('2026-06-15');
  });
});

describe('mapKotlinExpense / mapKotlinRecurring', () => {
  const expense: KotlinExpense = {
    id: 'e1',
    date: '2026-06-11',
    itemName: '장미 한 단',
    categoryId: 31,
    categoryLabel: '꽃 사입',
    unitPrice: 12000,
    quantity: 5,
    totalAmount: 60000,
    paymentMethodId: 41,
    paymentMethodLabel: '카드',
    cardCompany: null,
    vendor: '양재 꽃시장',
    memo: null,
    recurringId: null,
    isRecurringModified: false,
    createdAt: 'c',
    updatedAt: 'u',
  };

  it('지출 금액 필드(unit_price/quantity/total_amount)를 보존한다', () => {
    const e = mapKotlinExpense(expense);
    expect(e.unit_price).toBe(12000);
    expect(e.quantity).toBe(5);
    expect(e.total_amount).toBe(60000);
    expect(e.card_company).toBeUndefined();
  });

  it('고정비 주기 규칙(요일/일자/연간)을 그대로 매핑한다', () => {
    const recurring: KotlinRecurringExpense = {
      id: 'rc1', itemName: '월세', categoryId: 34, categoryLabel: '임대료',
      unitPrice: 1000000, quantity: 1, paymentMethodId: 42, paymentMethodLabel: '현금',
      vendor: null, memo: null, frequency: 'monthly', intervalCount: 1,
      daysOfWeek: [], daysOfMonth: [1, 15], yearlyDates: [],
      startDate: '2026-01-01', endDate: null, isActive: true, createdAt: 'c', updatedAt: 'u',
    };
    const r = mapKotlinRecurring(recurring);
    expect(r.frequency).toBe('monthly');
    expect(r.days_of_month).toEqual([1, 15]);
    expect(r.is_active).toBe(true);
  });
});

describe('mapKotlinCustomer', () => {
  const customer: KotlinCustomer = {
    id: 'c1', name: '김민지', phone: '010-1234-5678',
    grade: '단골', gradeId: 2, gradeLocked: false, gender: 'female', memo: null,
    totalPurchaseCount: 6, totalPurchaseAmount: 310000,
    firstPurchaseDate: '2026-01-05', lastPurchaseDate: '2026-06-01',
    photoThumbnails: null, photoCount: 0, createdAt: 'c', updatedAt: 'u',
  };

  it('썸네일이 null이면 빈 배열로 정규화한다', () => {
    expect(mapKotlinCustomer(customer).photo_thumbnails).toEqual([]);
  });

  it('신형({url,cardId})과 구형(문자열 URL) 썸네일을 모두 수용하고 url 없는 항목은 버린다', () => {
    const c = mapKotlinCustomer({
      ...customer,
      photoThumbnails: [{ url: 'u1', cardId: 7 }, 'u2', { url: '', cardId: 8 }],
    });
    expect(c.photo_thumbnails).toEqual([
      { url: 'u1', card_id: '7' },
      { url: 'u2', card_id: '' },
    ]);
  });
});
