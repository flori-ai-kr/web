import {describe, it} from 'vitest'
import * as fc from 'fast-check'
import {
    filterNumericInput,
    filterSalesByYearMonth,
    formatAmountInput,
    parseAmountInput,
} from '../utils'
import type {Sale} from '@/types/database'

// Helper to generate arbitrary Sale objects
const arbitrarySale = (): fc.Arbitrary<Sale> => {
  const paymentMethods: string[] = ['1', '2', '3', '4']
  const categories: string[] = ['mini_bouquet', 'basic_bouquet', 'medium_bouquet', 'large_bouquet', 'basket', 'vase']
  
  // Generate date as YYYY-MM-DD string directly
  const arbitraryDateString = fc.tuple(
    fc.integer({ min: 2024, max: 2030 }),
    fc.integer({ min: 1, max: 12 }),
    fc.integer({ min: 1, max: 28 })
  ).map(([year, month, day]) => 
    `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
  )
  
  return fc.record({
    id: fc.uuid(),
    user_id: fc.uuid(),
    date: arbitraryDateString,
    category_id: fc.constantFrom(...categories),
    category_label: fc.string({ minLength: 1, maxLength: 50 }),
    amount: fc.integer({ min: 1, max: 10000000 }),
    payment_method_id: fc.constantFrom(...paymentMethods),
    payment_method_label: fc.constantFrom('카드', '네이버페이', '계좌이체', '현금'),
    channel_id: fc.constantFrom('1', '2', '3', '4', '5'),
    channel_label: fc.constantFrom('전화', '카카오톡', '네이버예약', '로드', '기타'),
    is_unpaid: fc.boolean(),
    has_review: fc.boolean(),
    created_at: fc.constant(new Date().toISOString()),
    updated_at: fc.constant(new Date().toISOString()),
  })
}

describe('Amount Formatting', () => {
  // **Feature: sales-page-improvements, Property 1: Amount formatting round-trip**
  it('Property 1: formatting then parsing should return the original number', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 999999999999 }),
        (amount) => {
          const formatted = formatAmountInput(amount)
          const parsed = parseAmountInput(formatted)
          return parsed === amount
        }
      ),
      { numRuns: 100 }
    )
  })

  // **Feature: sales-page-improvements, Property 2: Non-numeric character filtering**
  it('Property 2: filterNumericInput should only retain numeric characters', () => {
    fc.assert(
      fc.property(
        fc.string(),
        (input) => {
          const filtered = filterNumericInput(input)
          return /^[0-9]*$/.test(filtered)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('Property 2 (extended): filtering should preserve all numeric characters in order', () => {
    fc.assert(
      fc.property(
        fc.string(),
        (input) => {
          const filtered = filterNumericInput(input)
          const expectedDigits = input.replace(/[^0-9]/g, '')
          return filtered === expectedDigits
        }
      ),
      { numRuns: 100 }
    )
  })
})



describe('Year/Month Filtering', () => {
  // **Feature: sales-page-improvements, Property 5: Year/Month filtering correctness**
  it('Property 5: filtered sales should only contain records from selected year and month', () => {
    fc.assert(
      fc.property(
        fc.array(arbitrarySale(), { minLength: 0, maxLength: 50 }),
        fc.integer({ min: 2024, max: 2030 }),
        fc.integer({ min: 1, max: 12 }),
        (sales, year, month) => {
          const filtered = filterSalesByYearMonth(sales, year, month)
          
          return filtered.every(sale => {
            const saleDate = new Date(sale.date)
            return saleDate.getFullYear() === year && saleDate.getMonth() + 1 === month
          })
        }
      ),
      { numRuns: 100 }
    )
  })

  it('Property 5 (completeness): all matching sales should be included', () => {
    fc.assert(
      fc.property(
        fc.array(arbitrarySale(), { minLength: 0, maxLength: 50 }),
        fc.integer({ min: 2024, max: 2030 }),
        fc.integer({ min: 1, max: 12 }),
        (sales, year, month) => {
          const filtered = filterSalesByYearMonth(sales, year, month)
          
          const expectedCount = sales.filter(sale => {
            const saleDate = new Date(sale.date)
            return saleDate.getFullYear() === year && saleDate.getMonth() + 1 === month
          }).length
          
          return filtered.length === expectedCount
        }
      ),
      { numRuns: 100 }
    )
  })
})

