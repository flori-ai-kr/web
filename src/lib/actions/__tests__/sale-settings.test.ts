import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('@/lib/auth-guard', () => ({ requireAuth: vi.fn() }))
vi.mock('@/lib/api/client', () => ({ apiFetch: vi.fn() }))

import { revalidatePath } from 'next/cache'
import { requireAuth } from '@/lib/auth-guard'
import { apiFetch } from '@/lib/api/client'
import {
  getSaleCategories,
  createSaleCategory,
  updateSaleCategory,
  deleteSaleCategory,
  getPaymentMethods,
  createPaymentMethod,
  updatePaymentMethod,
  deletePaymentMethod,
} from '../sale-settings'

const mockApiFetch = vi.mocked(apiFetch)
const mockRequireAuth = vi.mocked(requireAuth)
const mockRevalidate = vi.mocked(revalidatePath)

beforeEach(() => {
  vi.clearAllMocks()
  vi.spyOn(console, 'error').mockImplementation(() => {})
  mockRequireAuth.mockResolvedValue({ id: 'u1', name: 'T', email: 't@e.com' })
})

const dto = { id: '1', value: 'rose', label: '장미', color: '#ff0000', sortOrder: 2 }

describe('sale categories', () => {
  it('조회는 sort_order로 매핑하고 created_at은 빈 문자열', async () => {
    mockApiFetch.mockResolvedValue([dto])
    const res = await getSaleCategories()
    expect(mockApiFetch).toHaveBeenCalledWith('/settings/sale-categories')
    expect(res[0]).toEqual({ id: '1', value: 'rose', label: '장미', color: '#ff0000', sort_order: 2, created_at: '' })
  })

  it('null 응답은 빈 배열로 처리', async () => {
    mockApiFetch.mockResolvedValue(null)
    expect(await getSaleCategories()).toEqual([])
  })

  it('생성은 label/color로 POST하고 revalidate', async () => {
    mockApiFetch.mockResolvedValue(dto)
    await createSaleCategory('장미', '#ff0000')
    const body = JSON.parse(mockApiFetch.mock.calls[0][1]!.body as string)
    expect(body).toEqual({ label: '장미', color: '#ff0000' })
    expect(mockRevalidate).toHaveBeenCalledWith('/sales')
  })

  it('생성 시 color 미지정은 null로 전송', async () => {
    mockApiFetch.mockResolvedValue(dto)
    await createSaleCategory('장미')
    expect(JSON.parse(mockApiFetch.mock.calls[0][1]!.body as string).color).toBeNull()
  })

  it('수정은 PUT, 잘못된 id 거부', async () => {
    mockApiFetch.mockResolvedValue(dto)
    await updateSaleCategory('1', '장미', '#ff0000')
    expect(mockApiFetch).toHaveBeenCalledWith('/settings/sale-categories/1', expect.objectContaining({ method: 'PUT' }))
    await expect(updateSaleCategory('x', 'a', '#fff')).rejects.toThrow('ID 형식')
  })

  it('삭제는 DELETE, 잘못된 id 거부', async () => {
    mockApiFetch.mockResolvedValue(undefined)
    await deleteSaleCategory('1')
    expect(mockApiFetch).toHaveBeenCalledWith('/settings/sale-categories/1', { method: 'DELETE' })
    await expect(deleteSaleCategory('x')).rejects.toThrow('ID 형식')
  })
})

describe('payment methods', () => {
  it('조회/매핑', async () => {
    mockApiFetch.mockResolvedValue([dto])
    const res = await getPaymentMethods()
    expect(mockApiFetch).toHaveBeenCalledWith('/settings/payment-methods')
    expect(res[0].sort_order).toBe(2)
  })

  it('생성은 label/color/value POST', async () => {
    mockApiFetch.mockResolvedValue(dto)
    await createPaymentMethod('네이버페이', '#00c73c', 'naverpay')
    const body = JSON.parse(mockApiFetch.mock.calls[0][1]!.body as string)
    expect(body).toEqual({ label: '네이버페이', color: '#00c73c', value: 'naverpay' })
    expect(mockRevalidate).toHaveBeenCalledWith('/sales')
  })

  it('수정 PUT + 잘못된 id 거부', async () => {
    mockApiFetch.mockResolvedValue(dto)
    await updatePaymentMethod('1', '카드', '#3b82f6')
    expect(mockApiFetch).toHaveBeenCalledWith('/settings/payment-methods/1', expect.objectContaining({ method: 'PUT' }))
    await expect(updatePaymentMethod('x', 'a', '#fff')).rejects.toThrow('ID 형식')
  })

  it('삭제 DELETE + 잘못된 id 거부', async () => {
    mockApiFetch.mockResolvedValue(undefined)
    await deletePaymentMethod('1')
    expect(mockApiFetch).toHaveBeenCalledWith('/settings/payment-methods/1', { method: 'DELETE' })
    await expect(deletePaymentMethod('x')).rejects.toThrow('ID 형식')
  })
})
