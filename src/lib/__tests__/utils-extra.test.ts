import { describe, it, expect } from 'vitest'
import {
  cn,
  getTodayKST,
  getCurrentMonthKST,
  getMonthDateRange,
  sortByFrequency,
} from '../utils'

describe('cn', () => {
  it('클래스를 공백으로 합친다', () => {
    expect(cn('px-2', 'py-1')).toBe('px-2 py-1')
  })

  it('tailwind 충돌 클래스는 뒤의 값으로 병합한다', () => {
    expect(cn('p-2', 'p-4')).toBe('p-4')
  })

  it('falsy 값은 무시한다', () => {
    expect(cn('a', false, null, undefined, 'b')).toBe('a b')
  })
})

describe('getTodayKST', () => {
  it('YYYY-MM-DD 형식을 반환한다', () => {
    expect(getTodayKST()).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })
})

describe('getCurrentMonthKST', () => {
  it('YYYY-MM 형식이며 오늘 날짜의 연-월과 일치한다', () => {
    const month = getCurrentMonthKST()
    expect(month).toMatch(/^\d{4}-\d{2}$/)
    expect(month).toBe(getTodayKST().slice(0, 7))
  })
})

describe('getMonthDateRange', () => {
  it('해당 월의 1일과 말일을 반환한다 (2월, 비윤년)', () => {
    expect(getMonthDateRange('2026-02')).toEqual({
      startDate: '2026-02-01',
      endDate: '2026-02-28',
    })
  })

  it('윤년 2월은 29일을 말일로 한다', () => {
    expect(getMonthDateRange('2024-02')).toEqual({
      startDate: '2024-02-01',
      endDate: '2024-02-29',
    })
  })

  it('12월은 31일을 말일로 한다', () => {
    expect(getMonthDateRange('2026-12')).toEqual({
      startDate: '2026-12-01',
      endDate: '2026-12-31',
    })
  })

  it('인자가 없으면 현재 월 범위를 반환한다', () => {
    const range = getMonthDateRange()
    const month = getCurrentMonthKST()
    expect(range.startDate).toBe(`${month}-01`)
    expect(range.endDate.startsWith(month)).toBe(true)
  })
})

describe('sortByFrequency', () => {
  it('빈도 내림차순으로 중복 제거한다', () => {
    expect(sortByFrequency(['a', 'b', 'a', 'c', 'a', 'b'])).toEqual(['a', 'b', 'c'])
  })

  it('빈 배열은 빈 배열을 반환한다', () => {
    expect(sortByFrequency([])).toEqual([])
  })

  it('모두 고유하면 입력 순서를 유지한다', () => {
    expect(sortByFrequency(['x', 'y', 'z'])).toEqual(['x', 'y', 'z'])
  })
})
