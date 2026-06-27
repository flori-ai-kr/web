'use server'

import { redirect } from 'next/navigation'
import {
  clearRegisterToken,
  getRegisterToken,
  setAuthTokens,
} from '@/lib/api/auth-cookies'
import { REFERRAL_SOURCES } from '@/lib/onboarding-options'
import { log } from '@/lib/log'

// 참여경로 허용값 화이트리스트 — Server Action은 우회 호출이 가능하므로 임의/대형 입력을 웹에서 차단(방어 심층).
const ALLOWED_REFERRAL_SOURCES = new Set<string>(REFERRAL_SOURCES)

export interface RegistrationInput {
  /** 가게명 (필수) */
  name: string
  /** 사장님 실명 (필수) */
  ownerName: string
  /** 휴대폰 번호 (필수, 숫자만) */
  phoneNumber: string
  /** 닉네임 (필수) */
  nickname: string
  /** 이메일 (필수) */
  email: string
  /** 시/도 (필수) */
  regionSido: string
  /** 시군구 (선택) */
  regionSigungu?: string
  /** 사장님 나이대 (필수) */
  ownerAgeRange: string
  /** 사장님 스타일/콘텐츠 관심사 (선택, 다중) */
  interests?: string[]
  /** 가게 주력 분야 (선택, 다중) */
  specialties?: string[]
  /** flori를 알게 된 경로 (필수, 다중) */
  referralSources: string[]
}

interface TokenResponse {
  accessToken: string
  refreshToken: string
  tokenType: string
  expiresIn: number
}

export type RegistrationErrorKind = 'email' | 'nickname' | 'expired' | 'unknown'

interface RegistrationResult {
  error: string
  /** 에러 종류 — 폼이 적절한 단계/동작으로 분기한다. */
  kind: RegistrationErrorKind
}

export interface NicknameCheckResult {
  available: boolean
  error?: string
}

/**
 * 닉네임 사용 가능 여부를 확인한다(비인증).
 * server 계약: GET /auth/nickname/check?nickname=  → 200 사용 가능 / 409 중복.
 */
export async function checkNickname(nickname: string): Promise<NicknameCheckResult> {
  const value = nickname.trim()
  if (!value) return { available: false, error: '닉네임을 입력해 주세요.' }

  const base = process.env.API_URL ?? 'http://localhost:8080'
  let res: Response
  try {
    res = await fetch(`${base}/auth/nickname/check?nickname=${encodeURIComponent(value)}`, {
      method: 'GET',
      cache: 'no-store',
    })
  } catch {
    return { available: false, error: '확인에 실패했습니다. 잠시 후 다시 시도해 주세요.' }
  }

  if (res.status === 409) return { available: false, error: '이미 사용 중인 닉네임이에요.' }
  if (!res.ok) return { available: false, error: '확인에 실패했습니다. 잠시 후 다시 시도해 주세요.' }
  return { available: true }
}

/**
 * 소셜 신규 유저의 가입을 완료한다(비인증 — registerToken 쿠키가 자격증명).
 * `POST /auth/register/complete`를 호출한다. registerToken은 httpOnly 쿠키에서 읽어
 * body로 전달하므로 클라이언트는 토큰을 직접 다루지 않는다.
 *  - 201 → 토큰 쿠키 저장 + registerToken 쿠키 삭제 → /admin redirect
 *  - 409(이메일/신원 중복) → {kind:'email'} (Step1 이메일 인라인 에러)
 *  - 401(registerToken 만료) → {kind:'expired'} (소셜부터 재시작)
 */
export async function completeRegistration(
  input: RegistrationInput,
): Promise<RegistrationResult | void> {
  const registerToken = await getRegisterToken()
  if (!registerToken) {
    return { error: '세션이 만료됐어요. 다시 시도해 주세요.', kind: 'expired' }
  }

  const name = input.name?.trim()
  const ownerName = input.ownerName?.trim()
  const phoneNumber = input.phoneNumber?.replace(/\D/g, '')
  const nickname = input.nickname?.trim()
  const email = input.email?.trim()
  const regionSido = input.regionSido?.trim()

  if (!ownerName || !name || !nickname || !email || !regionSido || !phoneNumber || !/^01\d{8,9}$/.test(phoneNumber)) {
    return { error: '필수 항목을 모두 입력해 주세요.', kind: 'unknown' }
  }

  const sigungu = input.regionSigungu?.trim()
  const referralSources = (input.referralSources ?? [])
    .filter((v): v is string => typeof v === 'string' && ALLOWED_REFERRAL_SOURCES.has(v))
    .slice(0, 10)
  const body = {
    registerToken,
    ownerName,
    storeName: name,
    phoneNumber,
    nickname,
    email,
    regionSido,
    ...(sigungu ? { regionSigungu: sigungu } : {}),
    ownerAgeRange: input.ownerAgeRange,
    ...(input.interests && input.interests.length > 0 ? { interests: input.interests } : {}),
    ...(input.specialties && input.specialties.length > 0
      ? { specialties: input.specialties }
      : {}),
    referralSources,
  }

  const base = process.env.API_URL ?? 'http://localhost:8080'
  let res: Response
  try {
    res = await fetch(`${base}/auth/register/complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      cache: 'no-store',
    })
  } catch {
    return {
      error: '가입 정보를 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.',
      kind: 'unknown',
    }
  }

  if (res.status === 409) {
    let message: string | undefined
    let code: string | undefined
    let field: string | undefined
    try {
      const json = (await res.json()) as { message?: string; code?: string; field?: string }
      message = json?.message
      code = json?.code
      field = json?.field
    } catch {
      // JSON 본문이 없으면 기본 메시지 사용
    }
    // 이메일·닉네임 모두 unique 충돌(409). server가 code/field/message 중 무엇으로 알려주든
    // '닉네임' 신호가 잡히면 닉네임 충돌로, 아니면 이메일 충돌로 처리한다.
    const signal = `${code ?? ''} ${field ?? ''} ${message ?? ''}`
    if (/nickname|닉네임/i.test(signal)) {
      return { error: message ?? '이미 사용 중인 닉네임입니다.', kind: 'nickname' }
    }
    return { error: message ?? '이미 사용 중인 이메일입니다.', kind: 'email' }
  }

  if (res.status === 401) {
    return { error: '세션이 만료됐어요. 다시 시도해 주세요.', kind: 'expired' }
  }

  if (!res.ok) {
    return {
      error: '가입 정보를 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.',
      kind: 'unknown',
    }
  }

  const tokens = (await res.json()) as TokenResponse
  await setAuthTokens(tokens.accessToken, tokens.refreshToken, tokens.expiresIn)
  await clearRegisterToken()

  log.info({ event: 'auth.onboarding_complete' }, '🎉 온보딩 완료')
  redirect('/admin')
}
