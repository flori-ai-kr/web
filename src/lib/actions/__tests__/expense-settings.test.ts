import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('@/lib/auth-guard', () => ({ requireAuth: vi.fn() }))
vi.mock('@/lib/api/client', () => ({ apiFetch: vi.fn() }))

import { revalidatePath } from 'next/cache'
import { requireAuth } from '@/lib/auth-guard'
import { apiFetch } from '@/lib/api/client'
import {
  getExpenseCategories,
  getExpensePaymentMethods,
  createExpenseCategory,
  updateExpenseCategory,
  deleteExpenseCategory,
} from '../expense-settings'

const mockApiFetch = vi.mocked(apiFetch)
const mockRequireAuth = vi.mocked(requireAuth)
const mockRevalidate = vi.mocked(revalidatePath)

beforeEach(() => {
  vi.clearAllMocks()
  vi.spyOn(console, 'error').mockImplementation(() => {})
  mockRequireAuth.mockResolvedValue({ id: 'u1', name: 'T', email: 't@e.com' })
})

const dto = { id: '1', value: 'rent', label: '임대료', color: '#f97316', sortOrder: 4 }

describe('getExpenseCategories', () => {
  it('서버 항목이 있으면 매핑해 반환한다', async () => {
    mockApiFetch.mockResolvedValue([dto])
    const res = await getExpenseCategories()
    expect(res[0]).toMatchObject({ id: '1', value: 'rent', sort_order: 4 })
    expect(res[0].created_at).not.toBe('')
  })

  it('서버 항목이 비면 기본 카테고리로 fallback한다', async () => {
    mockApiFetch.mockResolvedValue([])
    const res = await getExpenseCategories()
    expect(res.length).toBeGreaterThan(1)
    expect(res.some((c) => c.value === 'flower_purchase')).toBe(true)
    expect(res[0].id).toBe('default-0')
  })

  it('조회 실패 시에도 기본값으로 fallback한다', async () => {
    mockApiFetch.mockRejectedValue(new Error('네트워크'))
    const res = await getExpenseCategories()
    expect(res.some((c) => c.value === 'other')).toBe(true)
  })
})

describe('getExpensePaymentMethods', () => {
  it('비면 기본 결제수단으로 fallback', async () => {
    mockApiFetch.mockResolvedValue([])
    const res = await getExpensePaymentMethods()
    expect(res.map((p) => p.value)).toEqual(['card', 'cash', 'transfer'])
  })

  it('실패 시 fallback', async () => {
    mockApiFetch.mockRejectedValue(new Error('x'))
    expect((await getExpensePaymentMethods()).length).toBe(3)
  })

  it('서버 항목이 있으면 매핑', async () => {
    mockApiFetch.mockResolvedValue([dto])
    expect((await getExpensePaymentMethods())[0].value).toBe('rent')
  })
})

describe('createExpenseCategory', () => {
  it('유효 입력은 POST 후 revalidate', async () => {
    mockApiFetch.mockResolvedValue(dto)
    await createExpenseCategory('임대료', '#f97316')
    expect(mockApiFetch).toHaveBeenCalledWith('/settings/expense-categories', expect.objectContaining({ method: 'POST' }))
    expect(mockRevalidate).toHaveBeenCalledWith('/admin/expenses')
  })

  it('빈 라벨은 거부', async () => {
    await expect(createExpenseCategory('', '#f97316')).rejects.toThrow()
    expect(mockApiFetch).not.toHaveBeenCalled()
  })
})

describe('updateExpenseCategory', () => {
  it('잘못된 id 거부', async () => {
    await expect(updateExpenseCategory('x', '임대료', '#f97316')).rejects.toThrow('ID 형식')
  })

  it('정상 PUT', async () => {
    mockApiFetch.mockResolvedValue(dto)
    await updateExpenseCategory('1', '임대료', '#f97316')
    expect(mockApiFetch).toHaveBeenCalledWith('/settings/expense-categories/1', expect.objectContaining({ method: 'PUT' }))
  })

  it('빈 라벨 거부', async () => {
    await expect(updateExpenseCategory('1', '', '#f97316')).rejects.toThrow()
  })
})

describe('deleteExpenseCategory', () => {
  it('정상 DELETE', async () => {
    mockApiFetch.mockResolvedValue(undefined)
    await deleteExpenseCategory('1')
    expect(mockApiFetch).toHaveBeenCalledWith('/settings/expense-categories/1', { method: 'DELETE' })
  })

  it('잘못된 id 거부', async () => {
    await expect(deleteExpenseCategory('x')).rejects.toThrow('ID 형식')
  })
})
