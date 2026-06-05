import { describe, it, expect } from 'vitest'
import {
  formatAmountInput,
  parseAmountInput,
  filterNumericInput,
  filterSalesByYearMonth,
  formatCurrency,
  formatPhoneNumber,
} from '../utils'
import type { Sale } from '@/types/database'

// Test fixtures - mock Sale objects with minimal required fields
const createMockSale = (
  overrides: Partial<Sale>
): Sale => ({
  id: 'test-id',
  date: '2026-01-15',
  customer_name: 'Test Customer',
  amount: 50000,
  payment_method_id: '1',
  payment_method_label: '카드',
  category_id: '5',
  category_label: '기본 꽃다발',
  is_unpaid: false,
  ...overrides,
} as Sale)

describe('formatAmountInput', () => {
  it('숫자를 한국 로케일 포맷으로 변환한다', () => {
    expect(formatAmountInput(1000)).toBe('1,000')
    expect(formatAmountInput(1000000)).toBe('1,000,000')
    expect(formatAmountInput(50000)).toBe('50,000')
  })

  it('문자열 입력을 파싱하여 포맷한다', () => {
    expect(formatAmountInput('1000')).toBe('1,000')
    expect(formatAmountInput('1,000')).toBe('1,000')
    expect(formatAmountInput('1,000,000')).toBe('1,000,000')
  })

  it('0은 빈 문자열을 반환한다', () => {
    expect(formatAmountInput(0)).toBe('')
    expect(formatAmountInput('0')).toBe('')
  })

  it('NaN은 빈 문자열을 반환한다', () => {
    expect(formatAmountInput(NaN)).toBe('')
    expect(formatAmountInput('abc')).toBe('')
  })

  it('빈 문자열은 빈 문자열을 반환한다', () => {
    expect(formatAmountInput('')).toBe('')
  })

  it('큰 숫자를 올바르게 포맷한다', () => {
    expect(formatAmountInput(999999999)).toBe('999,999,999')
    expect(formatAmountInput(1234567890)).toBe('1,234,567,890')
  })

  it('혼합된 문자가 포함된 문자열을 처리한다', () => {
    expect(formatAmountInput('1,2a3b4')).toBe('1,234')
    expect(formatAmountInput('₩50,000')).toBe('50,000')
  })
})

describe('parseAmountInput', () => {
  it('쉼표가 포함된 문자열을 숫자로 변환한다', () => {
    expect(parseAmountInput('1,000')).toBe(1000)
    expect(parseAmountInput('1,000,000')).toBe(1000000)
    expect(parseAmountInput('50,000')).toBe(50000)
  })

  it('숫자 문자열을 파싱한다', () => {
    expect(parseAmountInput('1000')).toBe(1000)
    expect(parseAmountInput('12345')).toBe(12345)
  })

  it('혼합된 문자에서 숫자만 추출한다', () => {
    expect(parseAmountInput('₩1,000원')).toBe(1000)
    expect(parseAmountInput('abc123def456')).toBe(123456)
    expect(parseAmountInput('1-2-3')).toBe(123)
  })

  it('빈 문자열은 0을 반환한다', () => {
    expect(parseAmountInput('')).toBe(0)
  })

  it('숫자가 없는 문자열은 0을 반환한다', () => {
    expect(parseAmountInput('abc')).toBe(0)
    expect(parseAmountInput('₩')).toBe(0)
  })

  it('특수문자만 있는 경우 0을 반환한다', () => {
    expect(parseAmountInput('!@#$%')).toBe(0)
    expect(parseAmountInput('...')).toBe(0)
  })
})

describe('filterNumericInput', () => {
  it('숫자만 남긴다', () => {
    expect(filterNumericInput('123')).toBe('123')
    expect(filterNumericInput('0987654321')).toBe('0987654321')
  })

  it('혼합된 문자에서 숫자만 추출한다', () => {
    expect(filterNumericInput('abc123def')).toBe('123')
    expect(filterNumericInput('₩1,000원')).toBe('1000')
  })

  it('특수문자를 제거한다', () => {
    expect(filterNumericInput('1-2-3')).toBe('123')
    expect(filterNumericInput('1,2,3')).toBe('123')
    expect(filterNumericInput('!@#123$%^')).toBe('123')
  })

  it('빈 문자열은 빈 문자열을 반환한다', () => {
    expect(filterNumericInput('')).toBe('')
  })

  it('숫자가 없으면 빈 문자열을 반환한다', () => {
    expect(filterNumericInput('abc')).toBe('')
    expect(filterNumericInput('!@#$%')).toBe('')
  })

  it('공백을 제거한다', () => {
    expect(filterNumericInput('1 2 3')).toBe('123')
    expect(filterNumericInput(' 123 ')).toBe('123')
  })
})

describe('filterSalesByYearMonth', () => {
  const sales: Sale[] = [
    createMockSale({ id: '1', date: '2026-01-15', amount: 10000 }),
    createMockSale({ id: '2', date: '2026-01-31', amount: 20000 }),
    createMockSale({ id: '3', date: '2026-02-01', amount: 30000 }),
    createMockSale({ id: '4', date: '2026-02-28', amount: 40000 }),
    createMockSale({ id: '5', date: '2025-12-31', amount: 50000 }),
  ]

  it('특정 연도와 월의 매출만 필터링한다', () => {
    const result = filterSalesByYearMonth(sales, 2026, 1)
    expect(result).toHaveLength(2)
    expect(result[0].id).toBe('1')
    expect(result[1].id).toBe('2')
  })

  it('다른 월의 매출을 필터링한다', () => {
    const result = filterSalesByYearMonth(sales, 2026, 2)
    expect(result).toHaveLength(2)
    expect(result[0].id).toBe('3')
    expect(result[1].id).toBe('4')
  })

  it('월 경계를 올바르게 처리한다', () => {
    const jan31 = filterSalesByYearMonth(sales, 2026, 1)
    const feb1 = filterSalesByYearMonth(sales, 2026, 2)

    expect(jan31.some(s => s.date === '2026-01-31')).toBe(true)
    expect(jan31.some(s => s.date === '2026-02-01')).toBe(false)
    expect(feb1.some(s => s.date === '2026-02-01')).toBe(true)
  })

  it('일치하는 매출이 없으면 빈 배열을 반환한다', () => {
    const result = filterSalesByYearMonth(sales, 2026, 3)
    expect(result).toHaveLength(0)
  })

  it('빈 배열에 대해 빈 배열을 반환한다', () => {
    const result = filterSalesByYearMonth([], 2026, 1)
    expect(result).toHaveLength(0)
  })

  it('이전 연도의 매출을 필터링한다', () => {
    const result = filterSalesByYearMonth(sales, 2025, 12)
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('5')
  })
})

describe('formatCurrency', () => {
  it('일반적인 금액을 한국 원화 포맷으로 변환한다', () => {
    expect(formatCurrency(10000)).toBe('₩10,000')
    expect(formatCurrency(50000)).toBe('₩50,000')
    expect(formatCurrency(1000000)).toBe('₩1,000,000')
  })

  it('0을 올바르게 포맷한다', () => {
    expect(formatCurrency(0)).toBe('₩0')
  })

  it('큰 금액을 올바르게 포맷한다', () => {
    expect(formatCurrency(999999999)).toBe('₩999,999,999')
    expect(formatCurrency(1234567890)).toBe('₩1,234,567,890')
  })

  it('음수를 올바르게 포맷한다', () => {
    expect(formatCurrency(-10000)).toBe('-₩10,000')
    expect(formatCurrency(-50000)).toBe('-₩50,000')
  })

  it('소수점 이하를 표시하지 않는다', () => {
    expect(formatCurrency(10000.99)).toBe('₩10,001')
    expect(formatCurrency(50000.49)).toBe('₩50,000')
  })

  it('1원 단위 금액을 포맷한다', () => {
    expect(formatCurrency(1)).toBe('₩1')
    expect(formatCurrency(999)).toBe('₩999')
  })
})

describe('formatPhoneNumber', () => {
  it('11자리 전화번호를 포맷한다', () => {
    expect(formatPhoneNumber('01012345678')).toBe('010-1234-5678')
    expect(formatPhoneNumber('01098765432')).toBe('010-9876-5432')
  })

  it('부분적인 전화번호를 포맷한다', () => {
    expect(formatPhoneNumber('010')).toBe('010')
    expect(formatPhoneNumber('0101')).toBe('010-1')
    expect(formatPhoneNumber('0101234')).toBe('010-1234')
    expect(formatPhoneNumber('010123456')).toBe('010-1234-56')
  })

  it('빈 문자열은 빈 문자열을 반환한다', () => {
    expect(formatPhoneNumber('')).toBe('')
  })

  it('이미 대시가 있는 번호를 재포맷한다', () => {
    expect(formatPhoneNumber('010-1234-5678')).toBe('010-1234-5678')
    expect(formatPhoneNumber('010-12-34-56-78')).toBe('010-1234-5678')
  })

  it('11자리를 초과하는 입력을 처리한다', () => {
    expect(formatPhoneNumber('010123456789')).toBe('010-1234-5678')
    expect(formatPhoneNumber('0101234567890')).toBe('010-1234-5678')
  })

  it('숫자가 아닌 문자를 제거하고 포맷한다', () => {
    expect(formatPhoneNumber('010abc1234def5678')).toBe('010-1234-5678')
    expect(formatPhoneNumber('010 1234 5678')).toBe('010-1234-5678')
  })

  it('3자리 이하는 대시 없이 반환한다', () => {
    expect(formatPhoneNumber('0')).toBe('0')
    expect(formatPhoneNumber('01')).toBe('01')
    expect(formatPhoneNumber('010')).toBe('010')
  })

  it('7자리 이하는 첫 번째 대시만 추가한다', () => {
    expect(formatPhoneNumber('0101')).toBe('010-1')
    expect(formatPhoneNumber('010123')).toBe('010-123')
    expect(formatPhoneNumber('0101234')).toBe('010-1234')
  })

  it('특수문자가 포함된 입력을 처리한다', () => {
    expect(formatPhoneNumber('(010)1234-5678')).toBe('010-1234-5678')
    expect(formatPhoneNumber('010.1234.5678')).toBe('010-1234-5678')
  })
})
