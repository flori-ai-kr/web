import { describe, it, expect } from 'vitest'
import {
  levelFormatter,
  kstTimestamp,
  kstIso,
  sanitizeErrorStack,
} from '../log-format'

describe('levelFormatter', () => {
  it('pino 레벨 라벨을 대문자 문자열로 변환한다 (api logstash 모양)', () => {
    expect(levelFormatter('info')).toEqual({ level: 'INFO' })
    expect(levelFormatter('warn')).toEqual({ level: 'WARN' })
    expect(levelFormatter('error')).toEqual({ level: 'ERROR' })
  })
})

describe('kstTimestamp', () => {
  it('@timestamp 키 + KST(+09:00) ISO8601 조각을 만든다', () => {
    // 2026-06-27T04:05:21.300Z (UTC) → KST 13:05:21.300+09:00
    const utc = new Date('2026-06-27T04:05:21.300Z')
    expect(kstTimestamp(utc)).toBe(',"@timestamp":"2026-06-27T13:05:21.300+09:00"')
  })

  it('자정 경계도 날짜가 정확히 넘어간다', () => {
    // 2026-06-27T15:30:00.000Z (UTC) → KST 다음날 00:30:00+09:00
    const utc = new Date('2026-06-27T15:30:00.000Z')
    expect(kstTimestamp(utc)).toBe(',"@timestamp":"2026-06-28T00:30:00.000+09:00"')
  })

  it('항상 +09:00 오프셋을 포함한다(Z 미포함)', () => {
    const frag = kstTimestamp(new Date('2026-01-01T00:00:00.000Z'))
    expect(frag).toContain('+09:00')
    expect(frag).not.toContain('Z')
  })
})

describe('kstIso', () => {
  it('plain KST ISO 문자열을 반환한다(@timestamp 키 없이)', () => {
    expect(kstIso(new Date('2026-06-27T04:05:21.300Z'))).toBe(
      '2026-06-27T13:05:21.300+09:00',
    )
  })
})

describe('sanitizeErrorStack', () => {
  it('로컬 경로/이메일/토큰/비번/키를 마스킹한다', () => {
    const stack = [
      'Error: boom',
      '    at /Users/hansangho/Desktop/flori-ai/web/src/x.ts:1:1',
      '    user=amoue@naver.com token=eyJabc.def.ghi password=secret123',
      '    key=AKIAABCDEFGHIJKLMNOP1234567890',
    ].join('\n')
    const out = sanitizeErrorStack(stack)
    expect(out).toContain('/home/user/Desktop')
    expect(out).not.toContain('hansangho')
    expect(out).toContain('[EMAIL]')
    expect(out).not.toContain('amoue@naver.com')
    expect(out).toContain('token=[REDACTED]')
    expect(out).toContain('password=[REDACTED]')
    expect(out).toContain('key=[REDACTED]')
  })

  it('20줄로 제한한다', () => {
    const stack = Array.from({ length: 50 }, (_, i) => `line ${i}`).join('\n')
    expect(sanitizeErrorStack(stack).split('\n')).toHaveLength(20)
  })
})
