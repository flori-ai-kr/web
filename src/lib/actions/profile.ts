'use server'

import { apiFetch } from '@/lib/api/client'
import { clearAuthTokens } from '@/lib/api/auth-cookies'
import { AppError, ErrorCode, withErrorLogging } from '@/lib/errors'
import { requireAuth } from '@/lib/auth-guard'

// ─── Types ──────────────────────────────────────────────────────

export interface UserProfile {
  id: string
  name: string
  nickname: string
  email: string
  profileImageUrl?: string | null
  regionSido: string
  regionSigungu?: string | null
  ownerAgeRange?: string | null
  interests: string[]
  specialties: string[]
  ownerName?: string | null
  phoneNumber?: string | null
}

export interface UpdateProfileInput {
  name: string
  nickname: string
  email: string
  regionSido: string
  regionSigungu?: string
  ownerAgeRange?: string | null
  interests?: string[]
  specialties?: string[]
  profileImageUrl?: string | null
}

interface UploadTargetDto {
  uploadUrl: string
  publicUrl: string
}

export interface ProfileUpdateResult {
  success: boolean
  error?: string
  field?: 'nickname' | 'email' | 'unknown'
}

export interface DeleteAccountResult {
  success: boolean
  error?: string
}

// ─── Actions ────────────────────────────────────────────────────

export const getProfile = withErrorLogging('getProfile', async (): Promise<UserProfile> => {
  await requireAuth()
  return apiFetch<UserProfile>('/me/profile')
})

export const updateProfile = withErrorLogging(
  'updateProfile',
  async (input: UpdateProfileInput): Promise<ProfileUpdateResult> => {
    await requireAuth()

    const body = {
      name: input.name.trim(),
      nickname: input.nickname.trim(),
      email: input.email.trim(),
      regionSido: input.regionSido,
      ...(input.regionSigungu?.trim() ? { regionSigungu: input.regionSigungu.trim() } : {}),
      ...(input.ownerAgeRange ? { ownerAgeRange: input.ownerAgeRange } : {}),
      ...(input.interests && input.interests.length > 0 ? { interests: input.interests } : {}),
      ...(input.specialties && input.specialties.length > 0 ? { specialties: input.specialties } : {}),
      ...(input.profileImageUrl ? { profileImageUrl: input.profileImageUrl } : {}),
    }

    try {
      await apiFetch('/me/profile', {
        method: 'PATCH',
        body: JSON.stringify(body),
      })
      return { success: true }
    } catch (error: unknown) {
      if (error && typeof error === 'object' && 'code' in error) {
        const appErr = error as { code: string; message: string }
        if (appErr.code === 'DUPLICATE') {
          const msg = appErr.message ?? ''
          if (/nickname|닉네임/i.test(msg)) {
            return { success: false, error: '이미 사용 중인 닉네임이에요.', field: 'nickname' }
          }
          return { success: false, error: '이미 사용 중인 이메일이에요.', field: 'email' }
        }
      }
      throw error
    }
  },
)

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']

export const getProfileUploadTarget = withErrorLogging(
  'getProfileUploadTarget',
  async (contentType: string): Promise<UploadTargetDto> => {
    await requireAuth()
    if (!ALLOWED_IMAGE_TYPES.includes(contentType)) {
      throw new AppError(ErrorCode.VALIDATION, '허용되지 않는 파일 형식입니다')
    }
    return apiFetch<UploadTargetDto>('/me/profile/upload-target', {
      method: 'POST',
      body: JSON.stringify({ contentType }),
    })
  },
)

export const deleteAccount = withErrorLogging(
  'deleteAccount',
  async (reason?: string, detail?: string): Promise<DeleteAccountResult> => {
    await requireAuth()

    const body = {
      ...(reason ? { reason } : {}),
      ...(detail?.trim() ? { detail: detail.trim() } : {}),
    }

    await apiFetch('/me', {
      method: 'DELETE',
      body: JSON.stringify(body),
    })

    await clearAuthTokens()
    return { success: true }
  },
)

export const checkNicknameAvailability = withErrorLogging(
  'checkNicknameAvailability',
  async (nickname: string): Promise<{ available: boolean; error?: string }> => {
    const value = nickname.trim()
    if (!value) return { available: false, error: '닉네임을 입력해 주세요.' }

    const base = process.env.API_URL ?? 'http://localhost:8080'
    const res = await fetch(`${base}/auth/nickname/check?nickname=${encodeURIComponent(value)}`, {
      method: 'GET',
      cache: 'no-store',
    })

    if (res.status === 409) return { available: false, error: '이미 사용 중인 닉네임이에요.' }
    if (!res.ok) return { available: false, error: '확인에 실패했습니다. 잠시 후 다시 시도해 주세요.' }
    return { available: true }
  },
)
