import { describe, it, expect, vi, beforeEach } from 'vitest'

// logger.reportError 는 Discord webhook(fetch)을 호출하므로 모킹한다.
vi.mock('@/lib/logger', () => ({
  reportError: vi.fn().mockResolvedValue(undefined),
}))

import { AppError, ErrorCode, withErrorLogging } from '../errors'
import { reportError } from '@/lib/logger'

const mockedReport = vi.mocked(reportError)

beforeEach(() => {
  mockedReport.mockClear()
})

describe('AppError', () => {
  it('code·message·name을 보존한다', () => {
    const err = new AppError(ErrorCode.VALIDATION, '검증 실패')
    expect(err).toBeInstanceOf(Error)
    expect(err).toBeInstanceOf(AppError)
    expect(err.code).toBe(ErrorCode.VALIDATION)
    expect(err.message).toBe('검증 실패')
    expect(err.name).toBe('AppError')
  })
})

describe('withErrorLogging', () => {
  it('정상 실행 시 결과를 그대로 반환한다', async () => {
    const wrapped = withErrorLogging('doThing', async (a: number, b: number) => a + b)
    await expect(wrapped(2, 3)).resolves.toBe(5)
    expect(mockedReport).not.toHaveBeenCalled()
  })

  it('AppError는 Discord 전송 없이 그대로 전파한다', async () => {
    const appErr = new AppError(ErrorCode.DUPLICATE, '중복')
    const wrapped = withErrorLogging('act', async () => {
      throw appErr
    })
    await expect(wrapped()).rejects.toBe(appErr)
    expect(mockedReport).not.toHaveBeenCalled()
  })

  it('Next.js 내부 에러(NEXT_ digest)는 그대로 전파한다', async () => {
    const redirectErr = Object.assign(new Error('redirect'), { digest: 'NEXT_REDIRECT;...' })
    const wrapped = withErrorLogging('act', async () => {
      throw redirectErr
    })
    await expect(wrapped()).rejects.toBe(redirectErr)
    expect(mockedReport).not.toHaveBeenCalled()
  })

  it('DYNAMIC_SERVER_USAGE digest도 그대로 전파한다', async () => {
    const dynErr = Object.assign(new Error('dynamic'), { digest: 'DYNAMIC_SERVER_USAGE' })
    const wrapped = withErrorLogging('act', async () => {
      throw dynErr
    })
    await expect(wrapped()).rejects.toBe(dynErr)
    expect(mockedReport).not.toHaveBeenCalled()
  })

  it('예상치 못한 에러는 Discord 전송 후 UNKNOWN AppError로 교체한다', async () => {
    const raw = new Error('DB 터짐')
    const wrapped = withErrorLogging('createSale', async () => {
      throw raw
    })

    const promise = wrapped()
    await expect(promise).rejects.toBeInstanceOf(AppError)
    await expect(promise).rejects.toMatchObject({ code: ErrorCode.UNKNOWN })
    await expect(promise).rejects.toThrow('일시적인 오류')

    expect(mockedReport).toHaveBeenCalledTimes(1)
    expect(mockedReport).toHaveBeenCalledWith(raw, { action: 'createSale' })
  })

  it('digest가 문자열이 아닌 객체는 내부 에러로 보지 않고 전송한다', async () => {
    const weird = Object.assign(new Error('weird'), { digest: 12345 })
    const wrapped = withErrorLogging('act', async () => {
      throw weird
    })
    await expect(wrapped()).rejects.toBeInstanceOf(AppError)
    expect(mockedReport).toHaveBeenCalledTimes(1)
  })

  it('NEXT_로 시작하지 않는 digest 문자열은 일반 에러로 전송한다', async () => {
    const other = Object.assign(new Error('x'), { digest: 'SOME_OTHER' })
    const wrapped = withErrorLogging('act', async () => {
      throw other
    })
    await expect(wrapped()).rejects.toBeInstanceOf(AppError)
    expect(mockedReport).toHaveBeenCalledTimes(1)
  })
})
