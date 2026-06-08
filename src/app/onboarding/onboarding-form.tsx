'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Check, Loader2 } from 'lucide-react'
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
import { AuthHeader } from '@/components/auth/auth-header'
import { cn } from '@/lib/utils'
import { AGE_RANGES, INTERESTS, SIDO, SPECIALTIES } from '@/lib/onboarding-options'
import { checkNickname, completeRegistration } from './actions'

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const PHONE_REGEX = /^01\d{8,9}$/
/** 숫자만 추출해 010-XXXX-XXXX 형태로 포맷. */
function formatPhone(value: string): string {
  const d = value.replace(/\D/g, '').slice(0, 11)
  if (d.length < 4) return d
  if (d.length < 8) return `${d.slice(0, 3)}-${d.slice(3)}`
  return `${d.slice(0, 3)}-${d.slice(3, 7)}-${d.slice(7)}`
}

function StepIndicator({ step }: { step: 1 | 2 }) {
  return (
    <div className="flex items-center justify-center gap-2" aria-label={`2단계 중 ${step}단계`}>
      <span
        className={cn('h-1.5 w-8 rounded-full transition-colors', step >= 1 ? 'bg-brand' : 'bg-border')}
        aria-hidden="true"
      />
      <span
        className={cn('h-1.5 w-8 rounded-full transition-colors', step >= 2 ? 'bg-brand' : 'bg-border')}
        aria-hidden="true"
      />
    </div>
  )
}

/** 토글 가능한 칩 버튼 (a11y: aria-pressed). */
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

export function OnboardingForm({
  defaultEmail,
  defaultNickname,
}: {
  defaultEmail: string
  defaultNickname: string
}) {
  const router = useRouter()
  const [step, setStep] = useState<1 | 2>(1)

  // Step 1 (필수)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [nickname, setNickname] = useState(defaultNickname)
  const [email, setEmail] = useState(defaultEmail)
  const [regionSido, setRegionSido] = useState('')
  const [regionSigungu, setRegionSigungu] = useState('')

  // Step 2 (선택)
  const [ownerAgeRange, setOwnerAgeRange] = useState<string | null>(null)
  const [interests, setInterests] = useState<string[]>([])
  const [specialties, setSpecialties] = useState<string[]>([])

  const [error, setError] = useState<string | null>(null)
  const [emailError, setEmailError] = useState<string | null>(null)
  const [nicknameError, setNicknameError] = useState<string | null>(null)
  const [nicknameStatus, setNicknameStatus] = useState<'idle' | 'checking' | 'available' | 'taken'>('idle')
  const [isLoading, setIsLoading] = useState(false)

  const step1Valid =
    name.trim().length > 0 &&
    PHONE_REGEX.test(phone.replace(/\D/g, '')) &&
    nickname.trim().length > 0 &&
    nicknameStatus === 'available' &&
    EMAIL_REGEX.test(email.trim()) &&
    regionSido.length > 0

  const toggleInArray = (
    value: string,
    list: string[],
    setList: (next: string[]) => void,
  ) => {
    setList(list.includes(value) ? list.filter((v) => v !== value) : [...list, value])
  }

  const goToStep2 = () => {
    if (!step1Valid) return
    setError(null)
    setStep(2)
  }

  // 닉네임 중복확인. 200=사용가능 / 409=중복. 'available'이어야 step1Valid 성립(다음/완료 가능).
  const handleNicknameCheck = async () => {
    const value = nickname.trim()
    if (!value) {
      setNicknameStatus('taken')
      setNicknameError('닉네임을 입력해 주세요.')
      return
    }
    setNicknameStatus('checking')
    setNicknameError(null)
    const result = await checkNickname(value)
    if (result.available) {
      setNicknameStatus('available')
      setNicknameError(null)
    } else {
      setNicknameStatus('taken')
      setNicknameError(result.error ?? '이미 사용 중인 닉네임이에요.')
    }
  }

  // 완료/건너뛰기 공통 제출. 선택값이 비어도 완료 가능.
  const handleComplete = async () => {
    if (!step1Valid) {
      setStep(1)
      setError('가게명·닉네임·이메일·지역(시/도)을 모두 입력해 주세요.')
      return
    }

    setError(null)
    setEmailError(null)
    setNicknameError(null)
    setIsLoading(true)

    const result = await completeRegistration({
      name: name.trim(),
      phoneNumber: phone.replace(/\D/g, ''),
      nickname: nickname.trim(),
      email: email.trim(),
      regionSido,
      regionSigungu: regionSigungu.trim() || undefined,
      ownerAgeRange: ownerAgeRange ?? undefined,
      interests,
      specialties,
    })

    // 성공 시 액션이 redirect 하므로 여기로 돌아오지 않는다.
    if (!result) return

    setIsLoading(false)

    if (result.kind === 'email') {
      // 이메일 중복 → Step1로 되돌려 이메일 인라인 에러 표시.
      setStep(1)
      setEmailError(result.error)
      return
    }

    if (result.kind === 'nickname') {
      // 닉네임 중복(중복확인 이후 경쟁 등) → Step1로 되돌려 닉네임 인라인 에러.
      setStep(1)
      setNicknameStatus('taken')
      setNicknameError(result.error)
      return
    }

    if (result.kind === 'expired') {
      // registerToken 만료 → 소셜부터 재시작.
      setError(result.error)
      router.push('/login')
      return
    }

    setError(result.error)
  }

  return (
    <div className="min-h-dvh flex items-center justify-center overflow-y-auto bg-background px-4 py-10">
      <div className="w-full max-w-md space-y-8">
        <AuthHeader subtitle="거의 다 왔어요. 조금만 더 알려주세요" />

        {/* 안내 */}
        <p className="text-center text-xs text-muted-foreground">
          입력 정보는 맞춤 추천에 사용돼요.{' '}
          <Link
            href="/policy/privacy"
            className="underline underline-offset-4 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
          >
            개인정보 처리방침
          </Link>
        </p>

        <StepIndicator step={step} />

        {step === 1 ? (
          <form
            onSubmit={(e) => {
              e.preventDefault()
              goToStep2()
            }}
            className="space-y-5"
          >
            <div className="space-y-2">
              <Label htmlFor="name">가게명</Label>
              <Input
                id="name"
                name="name"
                type="text"
                placeholder="예: 헤이즐 플라워"
                autoComplete="organization"
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                사업자등록증의 상호와 동일하게 정확히 입력해 주세요.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">전화번호</Label>
              <Input
                id="phone"
                name="phone"
                type="tel"
                inputMode="numeric"
                autoComplete="tel"
                placeholder="010-1234-5678"
                value={phone}
                onChange={(e) => setPhone(formatPhone(e.target.value))}
                aria-invalid={phone.length > 0 && !PHONE_REGEX.test(phone.replace(/\D/g, '')) ? true : undefined}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="nickname">닉네임</Label>
              <div className="flex gap-2">
                <Input
                  id="nickname"
                  name="nickname"
                  type="text"
                  placeholder="예: 헤이즐 사장님"
                  autoComplete="nickname"
                  value={nickname}
                  onChange={(e) => {
                    setNickname(e.target.value)
                    // 닉네임이 바뀌면 이전 확인 결과 무효 → 재확인 필요.
                    setNicknameStatus('idle')
                    if (nicknameError) setNicknameError(null)
                  }}
                  className="flex-1"
                  aria-invalid={nicknameStatus === 'taken' ? true : undefined}
                />
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
              <Label htmlFor="email">이메일</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="admin@example.com"
                autoComplete="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value)
                  if (emailError) setEmailError(null)
                }}
                aria-invalid={emailError ? true : undefined}
              />
              {emailError && (
                <p className="text-sm text-destructive" role="alert">
                  {emailError}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="regionSido">지역 (시/도)</Label>
              <Select value={regionSido} onValueChange={setRegionSido}>
                <SelectTrigger id="regionSido" className="w-full">
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
              <Label htmlFor="regionSigungu">
                시/군/구 <span className="text-muted-foreground">(선택)</span>
              </Label>
              <Input
                id="regionSigungu"
                name="regionSigungu"
                type="text"
                placeholder="예: 강남구"
                value={regionSigungu}
                onChange={(e) => setRegionSigungu(e.target.value)}
              />
            </div>

            {error && (
              <p className="text-sm text-destructive text-center" role="alert">
                {error}
              </p>
            )}

            <Button type="submit" className="h-10 w-full" disabled={!step1Valid}>
              다음
            </Button>
          </form>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault()
              void handleComplete()
            }}
            className="space-y-6"
          >
            <fieldset className="space-y-3" disabled={isLoading}>
              <legend className="text-sm font-medium text-foreground">
                나이대 <span className="text-muted-foreground">(선택)</span>
              </legend>
              <div className="flex flex-wrap gap-2">
                {AGE_RANGES.map((age) => (
                  <Chip
                    key={age}
                    label={age}
                    pressed={ownerAgeRange === age}
                    onToggle={() => setOwnerAgeRange((prev) => (prev === age ? null : age))}
                  />
                ))}
              </div>
            </fieldset>

            <fieldset className="space-y-3" disabled={isLoading}>
              <legend className="text-sm font-medium text-foreground">
                관심사 <span className="text-muted-foreground">(선택 · 다중)</span>
              </legend>
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
            </fieldset>

            <fieldset className="space-y-3" disabled={isLoading}>
              <legend className="text-sm font-medium text-foreground">
                가게 주력 <span className="text-muted-foreground">(선택 · 다중)</span>
              </legend>
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
            </fieldset>

            {error && (
              <p className="text-sm text-destructive text-center" role="alert">
                {error}
              </p>
            )}

            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                className="h-10 flex-1"
                onClick={() => {
                  setError(null)
                  setStep(1)
                }}
                disabled={isLoading}
              >
                <ArrowLeft className="w-4 h-4 mr-1" aria-hidden="true" />
                이전
              </Button>
              <Button type="submit" className="h-10 flex-1" disabled={isLoading}>
                {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" aria-hidden="true" />}
                {isLoading ? '저장하는 중...' : '완료'}
              </Button>
            </div>

            <Button
              type="button"
              variant="ghost"
              className="h-9 w-full text-muted-foreground"
              onClick={() => void handleComplete()}
              disabled={isLoading}
            >
              건너뛰기
            </Button>
          </form>
        )}
      </div>
    </div>
  )
}
