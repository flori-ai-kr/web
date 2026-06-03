import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { reportError } from '../logger'

const fetchMock = vi.fn()

beforeEach(() => {
  vi.stubGlobal('fetch', fetchMock)
  fetchMock.mockReset()
  fetchMock.mockResolvedValue({ ok: true })
  vi.stubEnv('NODE_ENV', 'production')
  vi.stubEnv('DISCORD_WEBHOOK_URL', 'https://discord.test/webhook')
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

interface DiscordBody {
  embeds: Array<{ fields: Array<{ name: string; value: string }> }>
}

function lastBody(): DiscordBody {
  const call = fetchMock.mock.calls.at(-1)!
  return JSON.parse((call[1] as RequestInit).body as string)
}

function fieldValue(body: DiscordBody, name: string): string | undefined {
  return body.embeds[0].fields.find((f) => f.name === name)?.value
}

describe('reportError — 콘솔 폴백', () => {
  it('개발 환경에서는 fetch를 호출하지 않고 콘솔에만 기록한다', async () => {
    vi.stubEnv('NODE_ENV', 'development')
    await reportError(new Error('dev only'), { action: 'devAct' })
    expect(fetchMock).not.toHaveBeenCalled()
    expect(console.error).toHaveBeenCalled()
  })

  it('웹훅 URL이 없으면 fetch를 호출하지 않는다', async () => {
    vi.stubEnv('DISCORD_WEBHOOK_URL', '')
    await reportError(new Error('no webhook'))
    expect(fetchMock).not.toHaveBeenCalled()
  })
})

describe('reportError — Discord 전송', () => {
  it('프로덕션 + 웹훅 설정 시 POST로 임베드를 전송한다', async () => {
    await reportError(new Error('운영 에러'), { action: 'createSale' })
    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('https://discord.test/webhook')
    expect((init as RequestInit).method).toBe('POST')
    const body = lastBody()
    expect(fieldValue(body, '오류 메시지')).toBe('운영 에러')
    expect(fieldValue(body, '액션')).toBe('createSale')
  })

  it('문자열 에러도 메시지로 전송한다', async () => {
    await reportError('문자열 에러 메시지')
    expect(fieldValue(lastBody(), '오류 메시지')).toBe('문자열 에러 메시지')
  })

  it('객체 에러는 JSON 직렬화하여 전송한다', async () => {
    await reportError({ reason: 'bad' })
    expect(fieldValue(lastBody(), '오류 메시지')).toBe('{"reason":"bad"}')
  })

  it('순환 참조 등 직렬화 불가 객체는 안전 메시지로 대체한다', async () => {
    const circular: Record<string, unknown> = {}
    circular.self = circular
    await reportError(circular)
    expect(fieldValue(lastBody(), '오류 메시지')).toBe('(직렬화 불가 에러)')
  })

  it('context.url이 있으면 URL 필드를 추가한다', async () => {
    await reportError(new Error('url 케이스'), { url: '/admin/sales' })
    expect(fieldValue(lastBody(), 'URL')).toBe('/admin/sales')
  })

  it('256자를 초과하는 메시지는 잘라낸다', async () => {
    await reportError(new Error('가'.repeat(300)))
    const value = fieldValue(lastBody(), '오류 메시지')!
    expect(value.length).toBe(256)
    expect(value.endsWith('...')).toBe(true)
  })

  it('스택 트레이스에서 민감 정보를 새니타이징한다', async () => {
    const err = new Error('민감 정보')
    err.stack = [
      'Error: 민감 정보',
      '    at /Users/hansangho/secret/app.ts:10:5',
      '    contact foo@bar.com',
      "    token='supersecrettoken'",
      "    password='hunter2'",
      '    key=ABCDEFGHIJKLMNOPQRSTUVWXYZ',
    ].join('\n')
    await reportError(err)
    const stack = fieldValue(lastBody(), '스택 트레이스')!
    expect(stack).toContain('/home/user')
    expect(stack).not.toContain('/Users/hansangho')
    expect(stack).toContain('[EMAIL]')
    expect(stack).toContain('token=[REDACTED]')
    expect(stack).toContain('password=[REDACTED]')
    expect(stack).toContain('key=[REDACTED]')
  })

  it('동일 메시지+액션은 5분 내 중복 전송하지 않는다', async () => {
    const msg = 'dedup-' + 'unique-key-1'
    await reportError(new Error(msg), { action: 'dedupAct' })
    await reportError(new Error(msg), { action: 'dedupAct' })
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('웹훅 전송이 실패해도 예외를 던지지 않는다', async () => {
    fetchMock.mockRejectedValueOnce(new Error('network down'))
    await expect(reportError(new Error('전송 실패 케이스'))).resolves.toBeUndefined()
    expect(console.error).toHaveBeenCalled()
  })
})
