import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/auth-guard', () => ({ requireAuth: vi.fn() }))
vi.mock('@/lib/api/client', () => ({ apiFetch: vi.fn() }))

import { requireAuth } from '@/lib/auth-guard'
import { apiFetch } from '@/lib/api/client'
import {
  sendChatMessage,
  getProactiveSuggestions,
  proposeReservationFromImage,
  confirmAiProposal,
} from '../ai'

const mockApiFetch = vi.mocked(apiFetch)
const mockRequireAuth = vi.mocked(requireAuth)

beforeEach(() => {
  vi.clearAllMocks()
  vi.spyOn(console, 'error').mockImplementation(() => {})
  mockRequireAuth.mockResolvedValue({ id: 'u1', name: 'T', email: 't@e.com' })
})

describe('sendChatMessage', () => {
  it('유효 메시지는 /ai/chat으로 POST', async () => {
    mockApiFetch.mockResolvedValue({ reply: 'hi' })
    await sendChatMessage({ message: '안녕', sessionToken: 'abc_123' })
    expect(mockApiFetch).toHaveBeenCalledWith('/ai/chat', expect.objectContaining({ method: 'POST' }))
    const body = JSON.parse(mockApiFetch.mock.calls[0][1]!.body as string)
    expect(body).toEqual({ message: '안녕', sessionToken: 'abc_123' })
  })

  it('빈 메시지는 거부', async () => {
    await expect(sendChatMessage({ message: '   ' })).rejects.toThrow()
    expect(mockApiFetch).not.toHaveBeenCalled()
  })

  it('잘못된 sessionToken은 거부', async () => {
    await expect(sendChatMessage({ message: '안녕', sessionToken: 'bad token!' })).rejects.toThrow()
  })
})

describe('getProactiveSuggestions', () => {
  it('suggestions 배열을 반환', async () => {
    mockApiFetch.mockResolvedValue({ suggestions: [{ id: '1' }] })
    expect(await getProactiveSuggestions()).toEqual([{ id: '1' }])
  })

  it('배열이 아니면 빈 배열', async () => {
    mockApiFetch.mockResolvedValue({ suggestions: null })
    expect(await getProactiveSuggestions()).toEqual([])
  })

  it('장애 시 fail-open으로 빈 배열', async () => {
    mockApiFetch.mockRejectedValue(new Error('ai down'))
    expect(await getProactiveSuggestions()).toEqual([])
  })
})

describe('proposeReservationFromImage', () => {
  it('유효 URL은 POST', async () => {
    mockApiFetch.mockResolvedValue({ cardId: 'c1' })
    await proposeReservationFromImage('https://cdn.example.com/a.jpg')
    expect(mockApiFetch).toHaveBeenCalledWith('/ai/ocr/reservation', expect.objectContaining({ method: 'POST' }))
  })

  it('잘못된 URL은 거부', async () => {
    await expect(proposeReservationFromImage('not-a-url')).rejects.toThrow()
    expect(mockApiFetch).not.toHaveBeenCalled()
  })
})

describe('confirmAiProposal', () => {
  it('유효 식별자는 POST', async () => {
    mockApiFetch.mockResolvedValue({ ok: true })
    await confirmAiProposal('proposal_42')
    const body = JSON.parse(mockApiFetch.mock.calls[0][1]!.body as string)
    expect(body).toEqual({ proposalId: 'proposal_42' })
  })

  it('잘못된 식별자는 거부', async () => {
    await expect(confirmAiProposal('bad id!')).rejects.toThrow('제안 식별자')
  })
})
