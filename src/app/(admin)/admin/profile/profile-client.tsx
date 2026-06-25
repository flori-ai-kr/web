'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { Camera, Check, Loader2, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { INTERESTS, SIDO, SPECIALTIES } from '@/lib/onboarding-options'
import type { UserProfile } from '@/lib/actions/profile'
import {
  checkNicknameAvailability,
  deleteAccount,
  getProfileUploadTarget,
  updateProfile,
} from '@/lib/actions/profile'

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const MAX_IMAGE_SIZE = 5 * 1024 * 1024 // 5MB

const WITHDRAWAL_REASONS = [
  '더 이상 꽃집을 운영하지 않아요',
  '사용하기 불편했어요',
  '다른 서비스를 이용하게 됐어요',
  '필요한 기능이 부족했어요',
  '기타',
] as const

function Chip({
  label,
  pressed,
  onToggle,
  disabled,
}: {
  label: string
  pressed: boolean
  onToggle: () => void
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onToggle}
      disabled={disabled}
      className={cn(
        'rounded-full border px-3.5 py-1.5 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50',
        pressed
          ? 'border-brand bg-brand text-brand-foreground'
          : 'border-border bg-muted text-foreground hover:bg-secondary',
      )}
    >
      {label}
    </button>
  )
}

export function ProfileClient({ profile }: { profile: UserProfile }) {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Form state
  const [name, setName] = useState(profile.name)
  const [nickname, setNickname] = useState(profile.nickname)
  const [email, setEmail] = useState(profile.email)
  const [regionSido, setRegionSido] = useState(profile.regionSido)
  const [regionSigungu, setRegionSigungu] = useState(profile.regionSigungu ?? '')
  // 나이대는 온보딩에서만 수집 — 프로필에선 표시·수정하지 않고 기존 값만 보존해 전송한다.
  const [ownerAgeRange] = useState<string | null>(profile.ownerAgeRange ?? null)
  const [interests, setInterests] = useState<string[]>(profile.interests ?? [])
  const [specialties, setSpecialties] = useState<string[]>(profile.specialties ?? [])

  // Avatar state
  const [avatarPreview, setAvatarPreview] = useState<string | null>(profile.profileImageUrl ?? null)
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false)

  // Nickname check
  const [nicknameStatus, setNicknameStatus] = useState<'idle' | 'checking' | 'available' | 'taken'>(
    'idle',
  )
  const [nicknameError, setNicknameError] = useState<string | null>(null)

  // Form submission
  const [isSaving, setIsSaving] = useState(false)

  // Withdrawal dialog
  const [withdrawOpen, setWithdrawOpen] = useState(false)
  const [withdrawReason, setWithdrawReason] = useState<string | null>(null)
  const [withdrawDetail, setWithdrawDetail] = useState('')
  const [isWithdrawing, setIsWithdrawing] = useState(false)
  const [withdrawDone, setWithdrawDone] = useState(false)

  const nicknameChanged = nickname.trim() !== profile.nickname

  const formValid =
    name.trim().length > 0 &&
    nickname.trim().length > 0 &&
    (!nicknameChanged || nicknameStatus === 'available') &&
    EMAIL_REGEX.test(email.trim()) &&
    regionSido.length > 0

  const toggleInArray = (value: string, list: string[], setList: (next: string[]) => void) => {
    setList(list.includes(value) ? list.filter((v) => v !== value) : [...list, value])
  }

  // ─── Avatar ─────────────────────────────────────────────────
  const handleAvatarClick = () => fileInputRef.current?.click()

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > MAX_IMAGE_SIZE) {
      toast.error('이미지는 5MB 이하만 업로드할 수 있어요')
      return
    }

    if (!file.type.startsWith('image/')) {
      toast.error('이미지 파일만 업로드할 수 있어요')
      return
    }

    setAvatarFile(file)
    if (avatarPreview?.startsWith('blob:')) URL.revokeObjectURL(avatarPreview)
    setAvatarPreview(URL.createObjectURL(file))
  }

  const uploadAvatar = async (): Promise<string | null> => {
    if (!avatarFile) return avatarPreview
    setIsUploadingAvatar(true)
    try {
      const target = await getProfileUploadTarget(avatarFile.type)
      const res = await fetch(target.uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': avatarFile.type },
        body: avatarFile,
      })
      if (!res.ok) throw new Error('upload failed')
      return target.publicUrl
    } catch {
      toast.error('프로필 사진 업로드에 실패했어요')
      return null
    } finally {
      setIsUploadingAvatar(false)
    }
  }

  // ─── Nickname check ─────────────────────────────────────────
  const handleNicknameCheck = async () => {
    const value = nickname.trim()
    if (!value) {
      setNicknameStatus('taken')
      setNicknameError('닉네임을 입력해 주세요.')
      return
    }
    setNicknameStatus('checking')
    setNicknameError(null)
    const result = await checkNicknameAvailability(value)
    if (result.available) {
      setNicknameStatus('available')
      setNicknameError(null)
    } else {
      setNicknameStatus('taken')
      setNicknameError(result.error ?? '이미 사용 중인 닉네임이에요.')
    }
  }

  // ─── Save ───────────────────────────────────────────────────
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formValid) return

    setIsSaving(true)
    try {
      // Upload avatar if changed
      let imageUrl: string | null | undefined = undefined
      if (avatarFile) {
        const uploaded = await uploadAvatar()
        if (!uploaded) {
          setIsSaving(false)
          return
        }
        imageUrl = uploaded
      }

      const result = await updateProfile({
        name: name.trim(),
        nickname: nickname.trim(),
        email: email.trim(),
        regionSido,
        regionSigungu: regionSigungu.trim() || undefined,
        ownerAgeRange,
        interests,
        specialties,
        profileImageUrl: imageUrl,
      })

      if (result.success) {
        toast.success('프로필이 저장되었어요')
        router.refresh()
      } else {
        if (result.field === 'nickname') {
          setNicknameStatus('taken')
          setNicknameError(result.error ?? '이미 사용 중인 닉네임이에요.')
        } else {
          toast.error(result.error ?? '저장에 실패했어요')
        }
      }
    } catch {
      toast.error('저장에 실패했어요. 잠시 후 다시 시도해 주세요.')
    } finally {
      setIsSaving(false)
    }
  }

  // ─── Withdrawal ─────────────────────────────────────────────
  const handleWithdraw = async () => {
    setIsWithdrawing(true)
    try {
      const reason = withdrawReason === '기타' ? undefined : (withdrawReason ?? undefined)
      const detail = withdrawReason === '기타' ? withdrawDetail : undefined
      const result = await deleteAccount(reason, detail)
      if (!result.success) {
        toast.error(result.error ?? '탈퇴 처리에 실패했어요.')
        setIsWithdrawing(false)
        return
      }
      setWithdrawDone(true)
      setTimeout(() => router.push('/login'), 2000)
    } catch {
      setIsWithdrawing(false)
      toast.error('탈퇴 처리에 실패했어요. 잠시 후 다시 시도해 주세요.')
    }
  }

  return (
    <div className="space-y-6 px-4 sm:px-6 py-1 sm:py-2 max-w-lg mx-auto">
      {/* Header (sticky) — 저장 버튼을 상단에 고정. top-0: 스크롤 컨테이너(pt-14) 기준 상단에 핀(갤러리와 동일 패턴) */}
      <div className="sticky top-0 z-20 -mx-4 sm:-mx-6 px-4 sm:px-6 py-3 bg-background/95 backdrop-blur-sm border-b border-border flex items-center gap-3">
        <Link
          href="/admin"
          className="flex items-center justify-center w-8 h-8 rounded-md hover:bg-muted shrink-0"
          aria-label="뒤로가기"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="flex-1 text-xl font-semibold text-foreground tracking-tight">내 프로필</h1>
        <Button
          type="submit"
          form="profile-form"
          size="sm"
          disabled={!formValid || isSaving}
          className="shrink-0"
        >
          {isSaving && <Loader2 className="w-4 h-4 mr-1.5 animate-spin" aria-hidden="true" />}
          {isSaving ? '저장 중...' : '저장'}
        </Button>
      </div>

      <form id="profile-form" onSubmit={handleSave} className="space-y-8">
        {/* Avatar */}
        <div className="flex justify-center">
          <button
            type="button"
            onClick={handleAvatarClick}
            className="relative group w-24 h-24 rounded-full overflow-hidden bg-muted border-2 border-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="프로필 사진 변경"
          >
            {avatarPreview ? (
              <Image
                src={avatarPreview}
                alt="프로필 사진"
                width={96}
                height={96}
                className="w-full h-full object-cover"
                unoptimized
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-2xl font-semibold text-muted-foreground">
                {(nickname.charAt(0) || name.charAt(0) || '?').toUpperCase()}
              </div>
            )}
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
              {isUploadingAvatar ? (
                <Loader2 className="w-5 h-5 text-white animate-spin" />
              ) : (
                <Camera className="w-5 h-5 text-white" />
              )}
            </div>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleAvatarChange}
          />
        </div>

        {/* Basic info */}
        <Card>
          <CardContent className="p-4 sm:p-5">
            <fieldset className="space-y-4" disabled={isSaving}>
              <legend className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-foreground">
                <span className="h-1.5 w-1.5 rounded-full bg-brand" aria-hidden="true" />
                기본 정보
              </legend>

          <div className="space-y-2">
            <Label>이름</Label>
            <Input value={profile.ownerName ?? ''} disabled readOnly />
          </div>
          <div className="space-y-2">
            <Label>전화번호</Label>
            <Input value={profile.phoneNumber ?? ''} disabled readOnly />
          </div>

          <div className="space-y-2">
            <Label htmlFor="profile-name">가게명</Label>
            <Input
              id="profile-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="예: 헤이즐 플라워"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="profile-nickname">닉네임</Label>
            <div className="flex gap-2">
              <Input
                id="profile-nickname"
                value={nickname}
                onChange={(e) => {
                  setNickname(e.target.value)
                  setNicknameStatus('idle')
                  if (nicknameError) setNicknameError(null)
                }}
                placeholder="예: 헤이즐 사장님"
                className="flex-1"
                aria-invalid={nicknameStatus === 'taken' ? true : undefined}
              />
              {nicknameChanged && (
                <Button
                  type="button"
                  variant="outline"
                  className="h-10 shrink-0"
                  onClick={handleNicknameCheck}
                  disabled={nicknameStatus === 'checking' || nickname.trim().length === 0}
                >
                  {nicknameStatus === 'checking' && (
                    <Loader2 className="w-4 h-4 mr-1 animate-spin" aria-hidden="true" />
                  )}
                  중복확인
                </Button>
              )}
            </div>
            {nicknameStatus === 'available' && (
              <p className="text-sm text-success flex items-center gap-1" role="status">
                <Check className="w-3.5 h-3.5" aria-hidden="true" />
                사용 가능한 닉네임이에요.
              </p>
            )}
            {nicknameStatus === 'taken' && nicknameError && (
              <p className="text-sm text-destructive" role="alert">
                {nicknameError}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="profile-email">이메일</Label>
            <Input
              id="profile-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@example.com"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="profile-sido">지역 (시/도)</Label>
            <Select value={regionSido} onValueChange={setRegionSido}>
              <SelectTrigger id="profile-sido" className="w-full">
                <SelectValue placeholder="시/도를 선택하세요" />
              </SelectTrigger>
              <SelectContent>
                {SIDO.map((sido) => (
                  <SelectItem key={sido} value={sido}>
                    {sido}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="profile-sigungu">
              시/군/구 <span className="text-muted-foreground">(선택)</span>
            </Label>
            <Input
              id="profile-sigungu"
              value={regionSigungu}
              onChange={(e) => setRegionSigungu(e.target.value)}
              placeholder="예: 강남구"
            />
          </div>
            </fieldset>
          </CardContent>
        </Card>

        {/* Preferences */}
        <Card>
          <CardContent className="p-4 sm:p-5">
            <fieldset className="space-y-5" disabled={isSaving}>
              <legend className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-foreground">
                <span className="h-1.5 w-1.5 rounded-full bg-brand" aria-hidden="true" />
                선호 정보
              </legend>

          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">관심사</p>
            <div className="flex flex-wrap gap-2">
              {INTERESTS.map((item) => (
                <Chip
                  key={item}
                  label={item}
                  pressed={interests.includes(item)}
                  onToggle={() => toggleInArray(item, interests, setInterests)}
                />
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">가게 주력</p>
            <div className="flex flex-wrap gap-2">
              {SPECIALTIES.map((item) => (
                <Chip
                  key={item}
                  label={item}
                  pressed={specialties.includes(item)}
                  onToggle={() => toggleInArray(item, specialties, setSpecialties)}
                />
              ))}
            </div>
          </div>
            </fieldset>
          </CardContent>
        </Card>

      </form>

      {/* Withdrawal section */}
      <div className="border-t border-border pt-6 mt-8">
        <button
          type="button"
          onClick={() => setWithdrawOpen(true)}
          className="text-sm text-muted-foreground hover:text-destructive transition-colors"
        >
          탈퇴하기
        </button>
      </div>

      {/* Withdrawal dialog */}
      <Dialog open={withdrawOpen} onOpenChange={setWithdrawOpen}>
        <DialogContent className="sm:max-w-md">
          {withdrawDone ? (
            <div className="py-6 text-center space-y-3">
              <p className="text-lg font-medium text-foreground">
                그동안 감사했어요
              </p>
              <p className="text-sm text-muted-foreground">
                언제든지 다시 돌아와 주세요!
              </p>
            </div>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle>정말 떠나시는 건가요?</DialogTitle>
                <DialogDescription>
                  탈퇴하시면 모든 데이터가 삭제되며 복구할 수 없어요.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-4">
                <p className="text-sm text-muted-foreground">
                  혹시 이유를 알려주실 수 있나요? (선택)
                </p>
                <div className="space-y-2">
                  {WITHDRAWAL_REASONS.map((reason) => (
                    <label
                      key={reason}
                      className={cn(
                        'flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors',
                        withdrawReason === reason
                          ? 'border-brand bg-brand/5'
                          : 'border-border hover:bg-muted',
                      )}
                    >
                      <input
                        type="radio"
                        name="withdraw-reason"
                        value={reason}
                        checked={withdrawReason === reason}
                        onChange={() => setWithdrawReason(reason)}
                        className="sr-only"
                      />
                      <div
                        className={cn(
                          'w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0',
                          withdrawReason === reason ? 'border-brand' : 'border-muted-foreground/40',
                        )}
                      >
                        {withdrawReason === reason && (
                          <div className="w-2 h-2 rounded-full bg-brand" />
                        )}
                      </div>
                      <span className="text-sm text-foreground">{reason}</span>
                    </label>
                  ))}
                </div>

                {withdrawReason === '기타' && (
                  <Input
                    value={withdrawDetail}
                    onChange={(e) => setWithdrawDetail(e.target.value)}
                    placeholder="이유를 적어주세요 (선택)"
                  />
                )}
              </div>

              <DialogFooter className="gap-2 sm:gap-0">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setWithdrawOpen(false)}
                  disabled={isWithdrawing}
                >
                  취소
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  onClick={handleWithdraw}
                  disabled={isWithdrawing}
                >
                  {isWithdrawing && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  탈퇴하기
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
