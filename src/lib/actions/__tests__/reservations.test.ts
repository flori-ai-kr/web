import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('@/lib/auth-guard', () => ({ requireAuth: vi.fn() }))
vi.mock('@/lib/api/client', () => ({ apiFetch: vi.fn() }))

import { revalidatePath } from 'next/cache'
import { requireAuth } from '@/lib/auth-guard'
import { apiFetch } from '@/lib/api/client'
import {
  getReservations,
  createReservation,
  updateReservation,
  deleteReservation,
  convertReservationToSale,
  addPickupToSale,
  getReservationsForSale,
  getTriggeredReminders,
  getUpcomingReservations,
  getReservationSuggestions,
} from '../reservations'

const mockApiFetch = vi.mocked(apiFetch)
const mockRequireAuth = vi.mocked(requireAuth)
const mockRevalidate = vi.mocked(revalidatePath)

beforeEach(() => {
  vi.clearAllMocks()
  vi.spyOn(console, 'error').mockImplementation(() => {})
  mockRequireAuth.mockResolvedValue({ id: 'u1', name: 'T', email: 't@e.com' })
})

const kRes = {
  id: 'r1', date: '2026-01-10', time: '14:00', customerName: '홍길동',
  customerPhone: '010-1', title: '픽업', description: null, status: 'pending',
  saleId: null, amount: 30000, reminderAt: null, reminderSent: false,
  pickupCompleted: false, createdAt: '2026-01-01', updatedAt: '2026-01-01',
}

const kSale = {
  id: 's1', date: '2026-01-10', productName: '꽃다발', productCategory: null,
  amount: 30000, paymentMethod: 'card', reservationChannel: 'other',
  customerName: '홍', customerPhone: null, customerId: null, note: null,
  isUnpaid: false, hasReview: false, createdAt: '2026-01-01', updatedAt: '2026-01-01',
}

const body = (call: number) => JSON.parse(mockApiFetch.mock.calls[call][1]!.body as string)

describe('getReservations', () => {
  it('month를 인코딩해 조회하고 sale 부가필드는 undefined로 채운다', async () => {
    mockApiFetch.mockResolvedValue([kRes])
    const res = await getReservations('2026-01')
    expect(mockApiFetch).toHaveBeenCalledWith('/reservations?month=2026-01')
    expect(res[0]).toMatchObject({ id: 'r1', customer_name: '홍길동', status: 'pending' })
    expect(res[0].product_category).toBeUndefined()
  })
})

describe('createReservation', () => {
  it('유효 입력은 camelCase로 POST하고 기본값을 채운다', async () => {
    mockApiFetch.mockResolvedValue(kRes)
    await createReservation({ date: '2026-01-10', customer_name: '홍길동', title: '픽업' })
    expect(mockApiFetch).toHaveBeenCalledWith('/reservations', expect.objectContaining({ method: 'POST' }))
    expect(body(0)).toMatchObject({ customerName: '홍길동', title: '픽업', amount: 0, status: 'pending' })
  })

  it('필수값 누락은 거부한다', async () => {
    await expect(createReservation({ date: '2026-01-10', customer_name: '', title: '' })).rejects.toThrow()
    expect(mockApiFetch).not.toHaveBeenCalled()
  })
})

describe('updateReservation', () => {
  it('제공된 필드만 PATCH 본문에 포함한다', async () => {
    mockApiFetch.mockResolvedValue(kRes)
    await updateReservation('1', { title: '변경', amount: 50000 })
    const b = body(0)
    expect(b).toEqual({ title: '변경', amount: 50000 })
    expect(mockApiFetch).toHaveBeenCalledWith('/reservations/1', expect.objectContaining({ method: 'PATCH' }))
  })

  it('pickup_completed/sale_id를 본문에 포함한다', async () => {
    mockApiFetch.mockResolvedValue(kRes)
    await updateReservation('1', { pickup_completed: true, sale_id: '9' })
    const b = body(0)
    expect(b.pickupCompleted).toBe(true)
    expect(b.saleId).toBe('9')
  })

  it('잘못된 예약 id는 거부한다', async () => {
    await expect(updateReservation('xx', { title: 'a' })).rejects.toThrow('올바르지 않은 ID')
  })

  it('잘못된 sale_id는 거부한다', async () => {
    await expect(updateReservation('1', { sale_id: 'bad' })).rejects.toThrow('매출 ID')
  })
})

describe('deleteReservation', () => {
  it('id 검증 후 DELETE한다', async () => {
    mockApiFetch.mockResolvedValue(undefined)
    await deleteReservation('1')
    expect(mockApiFetch).toHaveBeenCalledWith('/reservations/1', { method: 'DELETE' })
  })

  it('잘못된 id는 거부한다', async () => {
    await expect(deleteReservation('x')).rejects.toThrow('올바르지 않은 ID')
  })
})

describe('convertReservationToSale', () => {
  const saleForm = () => {
    const fd = new FormData()
    fd.set('date', '2026-01-10')
    fd.set('amount', '30000')
    fd.set('payment_method', 'card')
    return fd
  }

  it('FormData를 변환해 POST하고 calendar/홈을 revalidate한다', async () => {
    mockApiFetch.mockResolvedValue(kSale)
    const res = await convertReservationToSale('1', saleForm())
    expect(mockApiFetch).toHaveBeenCalledWith('/reservations/1/convert-to-sale', expect.objectContaining({ method: 'POST' }))
    expect(body(0)).toMatchObject({ amount: 30000, reservationChannel: 'other', paymentMethod: 'card' })
    expect(res.id).toBe('s1')
    expect(mockRevalidate).toHaveBeenCalledWith('/admin/calendar')
    expect(mockRevalidate).toHaveBeenCalledWith('/admin')
  })

  it('잘못된 예약 id는 거부한다', async () => {
    await expect(convertReservationToSale('x', saleForm())).rejects.toThrow('올바르지 않은 ID')
  })
})

describe('addPickupToSale', () => {
  it('매출 id 검증 후 add-pickup으로 POST한다', async () => {
    mockApiFetch.mockResolvedValue(kRes)
    await addPickupToSale('5', { date: '2026-01-10', title: '픽업' })
    expect(mockApiFetch).toHaveBeenCalledWith('/reservations/add-pickup/5', expect.objectContaining({ method: 'POST' }))
    expect(mockRevalidate).toHaveBeenCalledWith('/admin/calendar')
  })

  it('잘못된 매출 id는 거부한다', async () => {
    await expect(addPickupToSale('x', { date: '2026-01-10', title: 't' })).rejects.toThrow('매출 ID')
  })
})

describe('getReservationsForSale', () => {
  it('잘못된 id는 빈 배열', async () => {
    expect(await getReservationsForSale('x')).toEqual([])
    expect(mockApiFetch).not.toHaveBeenCalled()
  })

  it('정상 id는 by-sale로 조회', async () => {
    mockApiFetch.mockResolvedValue([kRes])
    const res = await getReservationsForSale('5')
    expect(mockApiFetch).toHaveBeenCalledWith('/reservations/by-sale/5')
    expect(res[0].id).toBe('r1')
  })
})

describe('단순 조회 액션', () => {
  it('getTriggeredReminders', async () => {
    mockApiFetch.mockResolvedValue([kRes])
    expect((await getTriggeredReminders())[0].id).toBe('r1')
    expect(mockApiFetch).toHaveBeenCalledWith('/reservations/reminders')
  })

  it('getUpcomingReservations', async () => {
    mockApiFetch.mockResolvedValue([kRes])
    expect((await getUpcomingReservations())[0].id).toBe('r1')
    expect(mockApiFetch).toHaveBeenCalledWith('/reservations/upcoming')
  })

  it('getReservationSuggestions', async () => {
    mockApiFetch.mockResolvedValue({ titles: ['픽업'], descriptions: [] })
    expect(await getReservationSuggestions()).toEqual({ titles: ['픽업'], descriptions: [] })
    expect(mockApiFetch).toHaveBeenCalledWith('/reservations/suggestions')
  })
})
