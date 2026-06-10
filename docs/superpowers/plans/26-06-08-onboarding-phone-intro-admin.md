# 온보딩 전화번호·기능소개 캐러셀 + 슈퍼어드민 커뮤니티 패스·관리자 칩 — 구현 플랜

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 온보딩에 전화번호 필수 입력과 기능 소개 캐러셀을 추가하고, 슈퍼어드민이 커뮤니티 사업자 인증을 패스하며 운영자 작성물에 "관리자" 칩이 표시되도록 한다.

**Architecture:** web(Next.js)와 api(Kotlin)에 걸친 작업. 전화번호는 web 온보딩 폼 + api `register/complete`(UserProfile.phone_number, NOT NULL) 양쪽. 캐러셀은 web 전용(2-step→3-step, 제출을 Step3 마지막으로 이동). 관리자 칩은 api 커뮤니티 응답에 `authorIsAdmin` 추가 → web "관리자" 배지 렌더. 사업자 인증 패스는 web 공용 헬퍼.

**Tech Stack:** Next.js 16/React 19/TS/Tailwind/shadcn/Vitest (web), Kotlin/Spring Boot/JPA/JUnit5/RestDocs (api), PostgreSQL.

**경로 주의:** web 작업 디렉터리 = 현재 워크트리(`.claude/worktrees/onboarding-console`). api 작업 디렉터리 = `/Users/hansangho/Desktop/flori-ai/api`(워크트리 없음, 단일 브랜치). api 작업 전 `cd /Users/hansangho/Desktop/flori-ai/api && git checkout -b feature/onboarding-phone` 로 dev 기준 브랜치를 만든다(현재 feature/qa3이면 `git checkout dev` 후 분기).

**커밋 컨벤션:** `type(web|api): 한국어 설명` + `Co-Authored-By: Claude <noreply@anthropic.com>`. `git add -A` 금지 — 변경 파일만 명시.

---

## 파일 구조 (생성/수정)

**api** (`/Users/hansangho/Desktop/flori-ai/api`)
- Modify: `src/main/kotlin/kr/ai/flori/user/entity/UserProfile.kt` — `phoneNumber` 컬럼
- Modify: `docs/sql/all-tables-ddl.sql` — user_profiles에 phone_number NOT NULL
- Create: `docs/sql/migration/26-06-08-user-profiles-phone-number.sql` — ALTER TABLE
- Modify: `src/main/kotlin/kr/ai/flori/auth/dto/AuthDtos.kt` — RegisterCompleteRequest.phoneNumber
- Modify: `src/main/kotlin/kr/ai/flori/auth/service/AuthService.kt` — UserProfile 생성 시 phoneNumber 저장
- Modify: `src/main/kotlin/kr/ai/flori/user/service/OnboardingService.kt` — orElseGet 생성자 시그니처 맞춤
- Modify: `src/main/kotlin/kr/ai/flori/community/dto/CommunityDtos.kt` — PostResponse/CommentResponse.authorIsAdmin
- Modify: `src/main/kotlin/kr/ai/flori/community/service/CommunityService.kt` — 작성자 isAdmin 조회·전달
- Modify: 관련 테스트 (`RegisterCompleteDocsTest`, `AuthFlowIntegrationTest`, `OnboardingApiIntegrationTest`, community 테스트), OpenAPI 스냅샷

**web** (현재 워크트리)
- Modify: `src/app/onboarding/onboarding-form.tsx` — 전화번호 필드, 가게명 안내, 3-step, 제출 이동
- Modify: `src/app/onboarding/actions.ts` — RegistrationInput.phoneNumber
- Create: `src/app/onboarding/feature-intro-carousel.tsx` — 캐러셀
- Create: `src/app/onboarding/__tests__/feature-intro-carousel.test.tsx`
- Modify: `src/lib/validations.ts` — (필요 시) 전화번호 헬퍼
- Create: `src/lib/actions/business-verification.ts`의 `ensureCommunityAccess()` (Modify 파일)
- Modify: `src/app/(admin)/admin/community/page.tsx`, `write/page.tsx`, `[id]/page.tsx`, `[id]/edit/page.tsx` — 게이트 헬퍼 교체
- Modify: `src/types/database.ts` — `author_is_admin`
- Modify: `src/lib/actions/community.ts` — DTO 미러 + 매퍼
- Create: `src/components/community/admin-badge.tsx` — "관리자" 칩
- Modify: `src/components/community/post-card.tsx`, `comment-tree.tsx`, `community-client.tsx`, `[id]/community-detail-client.tsx` — 칩 렌더
- Modify: 관련 테스트

---

## Phase A — api: 전화번호 (UserProfile.phone_number)

### Task A1: UserProfile 엔티티에 phoneNumber 추가

**Files:**
- Modify: `src/main/kotlin/kr/ai/flori/user/entity/UserProfile.kt`

- [ ] **Step 1: 생성자에 phoneNumber 추가**

`UserProfile` 생성자에 `storeName`, `regionSido` 다음 위치에 추가:

```kotlin
class UserProfile(
    @Id
    @Column(name = "user_id")
    var userId: Long,
    @Column(name = "store_name", nullable = false)
    var storeName: String,
    @Column(name = "phone_number", nullable = false)
    var phoneNumber: String,
    @Column(name = "region_sido", nullable = false)
    var regionSido: String,
) : BaseEntity() {
```

(나머지 본문 프로퍼티는 그대로 둔다.)

- [ ] **Step 2: 컴파일은 다음 Task에서 함께 — 지금은 커밋만 보류**

이 Task는 단독 빌드가 깨진다(호출부 미반영). Task A2~A4 완료 후 한 번에 빌드/커밋한다. 다음 Task로 진행.

---

### Task A2: DDL + 마이그레이션

**Files:**
- Modify: `docs/sql/all-tables-ddl.sql`
- Create: `docs/sql/migration/26-06-08-user-profiles-phone-number.sql`

- [ ] **Step 1: all-tables-ddl.sql 수정**

`user_profiles` 테이블 정의에서 `store_name TEXT NOT NULL,` 다음 줄에 추가:

```sql
  phone_number TEXT NOT NULL,
```

결과:

```sql
CREATE TABLE user_profiles (
  user_id BIGINT PRIMARY KEY,
  store_name TEXT NOT NULL,
  phone_number TEXT NOT NULL,
  profile_image_url TEXT,
  region_sido TEXT NOT NULL,
  ...
```

- [ ] **Step 2: 마이그레이션 파일 작성**

`docs/sql/migration/26-06-08-user-profiles-phone-number.sql`:

```sql
-- user_profiles.phone_number 추가 — 온보딩 전화번호 필수 입력.
-- 기존 행이 있으면 임시로 '' 채운 뒤 운영자가 실제 번호로 백필한다(NOT NULL 위반 회피).
START TRANSACTION;

ALTER TABLE user_profiles ADD COLUMN phone_number TEXT NOT NULL DEFAULT '';
ALTER TABLE user_profiles ALTER COLUMN phone_number DROP DEFAULT;

COMMIT;
```

- [ ] **Step 3: 커밋 보류 — Task A4에서 일괄**

---

### Task A3: RegisterCompleteRequest에 phoneNumber 추가

**Files:**
- Modify: `src/main/kotlin/kr/ai/flori/auth/dto/AuthDtos.kt`

- [ ] **Step 1: DTO 필드 추가**

`RegisterCompleteRequest`에서 `storeName` 다음에 추가(`FieldLimits.PHONE = 20` 재사용):

```kotlin
    @field:NotBlank(message = "전화번호는 필수입니다")
    @field:Pattern(regexp = "^01\\d{8,9}$", message = "전화번호 형식이 올바르지 않습니다")
    @field:Schema(description = "휴대폰 번호(숫자만, 하이픈 없음)", example = "01012345678")
    val phoneNumber: String,
```

import 확인: 파일 상단에 `import jakarta.validation.constraints.Pattern` 없으면 추가.

- [ ] **Step 2: 커밋 보류**

---

### Task A4: AuthService·OnboardingService 생성자 반영 + 빌드 + 커밋

**Files:**
- Modify: `src/main/kotlin/kr/ai/flori/auth/service/AuthService.kt`
- Modify: `src/main/kotlin/kr/ai/flori/user/service/OnboardingService.kt`

- [ ] **Step 1: AuthService UserProfile 생성에 phoneNumber 전달**

`AuthService.kt`의 `UserProfile(` 생성 블록(약 line 193)에서 `storeName = request.storeName,` 다음에:

```kotlin
                phoneNumber = request.phoneNumber,
```

- [ ] **Step 2: OnboardingService orElseGet 생성자 시그니처 맞춤**

`OnboardingService.kt`의 `orElseGet { UserProfile(...) }`(약 line 68)는 프로필 편집(upsert) 경로다. 전화번호는 이 경로 범위 밖이므로, 신규 생성 폴백에 한해 빈 문자열을 넣는다(정상 흐름에선 register가 이미 프로필을 만들어 두므로 이 분기는 사실상 실행되지 않음):

```kotlin
                    UserProfile(
                        userId = userId,
                        storeName = request.name,
                        phoneNumber = "",
                        regionSido = request.regionSido,
                    )
```

- [ ] **Step 3: 빌드/컴파일 확인**

Run: `cd /Users/hansangho/Desktop/flori-ai/api && ./gradlew compileKotlin -q`
Expected: BUILD SUCCESSFUL (호출부 모두 반영되어 컴파일 통과)

- [ ] **Step 4: 커밋 (A1~A4 일괄)**

```bash
cd /Users/hansangho/Desktop/flori-ai/api
git add src/main/kotlin/kr/ai/flori/user/entity/UserProfile.kt \
        docs/sql/all-tables-ddl.sql \
        docs/sql/migration/26-06-08-user-profiles-phone-number.sql \
        src/main/kotlin/kr/ai/flori/auth/dto/AuthDtos.kt \
        src/main/kotlin/kr/ai/flori/auth/service/AuthService.kt \
        src/main/kotlin/kr/ai/flori/user/service/OnboardingService.kt
git commit -m "feat(api): 온보딩 전화번호 필수 입력 — user_profiles.phone_number

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task A5: register/complete 통합 테스트에 phoneNumber 반영

**Files:**
- Test: `src/test/kotlin/kr/ai/flori/auth/AuthFlowIntegrationTest.kt`
- Test: `src/test/kotlin/kr/ai/flori/auth/docs/RegisterCompleteDocsTest.kt`
- Test: `src/test/kotlin/kr/ai/flori/user/OnboardingApiIntegrationTest.kt` (register 호출 시)

- [ ] **Step 1: 기존 테스트 실패 확인 (필수 필드 누락)**

Run: `cd /Users/hansangho/Desktop/flori-ai/api && ./gradlew test --tests "*RegisterCompleteDocsTest*" -q`
Expected: FAIL — 기존 요청 본문에 phoneNumber 없어 400(검증) 또는 단언 불일치.

- [ ] **Step 2: 테스트 요청 본문에 phoneNumber 추가**

각 register/complete 요청 JSON/DTO 빌더에 `"phoneNumber": "01012345678"`(또는 `phoneNumber = "01012345678"`) 추가. RestDocs 필드 문서(`fieldWithPath("phoneNumber")...`)도 추가:

```kotlin
fieldWithPath("phoneNumber").description("휴대폰 번호(숫자만, 하이픈 없음)"),
```

(기존 `storeName` 필드 문서 라인 바로 아래에 동일 패턴으로 추가.)

- [ ] **Step 3: 전화번호 검증 실패 케이스 테스트 추가 (RegisterCompleteDocsTest 또는 AuthFlowIntegrationTest)**

```kotlin
@Test
fun `전화번호 형식이 틀리면 400`() {
    // given: 유효한 registerToken 발급 후
    val body = validRegisterBody().toMutableMap().apply { put("phoneNumber", "123") }
    // when/then
    mockMvc.perform(
        post("/auth/register/complete")
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(body)),
    ).andExpect(status().isBadRequest)
}
```

(`validRegisterBody()`는 테스트 파일의 기존 헬퍼 패턴에 맞춰 사용 — 없으면 인라인으로 유효 본문 구성.)

- [ ] **Step 4: 저장 검증 — 프로필에 phone_number 반영**

`AuthFlowIntegrationTest`에 가입 성공 후 프로필 조회 시 phoneNumber가 저장됐는지 단언 추가(해당 테스트에 프로필/`/me` 조회 단계가 있으면 거기에, 없으면 `userProfileRepository.findById`로 직접 확인):

```kotlin
val profile = userProfileRepository.findById(newUserId).orElseThrow()
assertThat(profile.phoneNumber).isEqualTo("01012345678")
```

- [ ] **Step 5: 테스트 통과 확인**

Run: `./gradlew test --tests "*RegisterComplete*" --tests "*AuthFlowIntegration*" --tests "*OnboardingApiIntegration*" -q`
Expected: PASS

- [ ] **Step 6: OpenAPI 스냅샷 갱신**

RestDocs가 OpenAPI를 생성하는 경우 전체 테스트로 스냅샷이 갱신된다.
Run: `./gradlew test -q` (또는 프로젝트의 openapi 생성 task)
변경된 `src/main/resources/static/docs/open-api-3.0.1.json` 확인.

- [ ] **Step 7: 커밋**

```bash
git add src/test/kotlin/kr/ai/flori/auth src/test/kotlin/kr/ai/flori/user/OnboardingApiIntegrationTest.kt src/main/resources/static/docs/open-api-3.0.1.json
git commit -m "test(api): register/complete phoneNumber 검증·저장 테스트 + OpenAPI 갱신

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Phase B — web: 온보딩 전화번호 + 가게명 안내

### Task B1: actions.ts에 phoneNumber 추가

**Files:**
- Modify: `src/app/onboarding/actions.ts`

- [ ] **Step 1: RegistrationInput에 phoneNumber 추가**

`RegistrationInput` 인터페이스에서 `name` 다음에:

```typescript
  /** 휴대폰 번호 (필수, 숫자만) */
  phoneNumber: string
```

- [ ] **Step 2: completeRegistration 검증·전송 반영**

`completeRegistration` 내부 필수값 검사부에 전화번호 추가. `name`/`nickname` 추출 부근:

```typescript
  const name = input.name?.trim()
  const phoneNumber = input.phoneNumber?.replace(/\D/g, '')
  const nickname = input.nickname?.trim()
  const email = input.email?.trim()
  const regionSido = input.regionSido?.trim()

  if (!name || !nickname || !email || !regionSido || !phoneNumber || !/^01\d{8,9}$/.test(phoneNumber)) {
    return { error: '필수 항목을 모두 입력해 주세요.', kind: 'unknown' }
  }
```

body 객체(`storeName: name,` 부근)에 추가:

```typescript
    storeName: name,
    phoneNumber,
```

- [ ] **Step 3: 빌드 확인(타입)**

Run: `npx tsc --noEmit -p tsconfig.json 2>&1 | head`
Expected: onboarding-form.tsx에서 phoneNumber 누락 에러(다음 Task에서 해결). actions.ts 자체 에러 없음.

- [ ] **Step 4: 커밋 보류 — Task B2와 함께**

---

### Task B2: onboarding-form.tsx — 전화번호 필드 + 가게명 안내

**Files:**
- Modify: `src/app/onboarding/onboarding-form.tsx`

- [ ] **Step 1: phone 상태 + 포맷 헬퍼 추가**

상단 상태 선언부(`const [name, setName] = useState('')` 부근)에 추가:

```typescript
  const [phone, setPhone] = useState('')
```

컴포넌트 밖(파일 상단, `EMAIL_REGEX` 부근)에 헬퍼 추가:

```typescript
const PHONE_REGEX = /^01\d{8,9}$/
/** 숫자만 추출해 010-XXXX-XXXX 형태로 포맷. */
function formatPhone(value: string): string {
  const d = value.replace(/\D/g, '').slice(0, 11)
  if (d.length < 4) return d
  if (d.length < 8) return `${d.slice(0, 3)}-${d.slice(3)}`
  return `${d.slice(0, 3)}-${d.slice(3, 7)}-${d.slice(7)}`
}
```

- [ ] **Step 2: step1Valid에 전화번호 조건 추가**

```typescript
  const step1Valid =
    name.trim().length > 0 &&
    PHONE_REGEX.test(phone.replace(/\D/g, '')) &&
    nickname.trim().length > 0 &&
    nicknameStatus === 'available' &&
    EMAIL_REGEX.test(email.trim()) &&
    regionSido.length > 0
```

- [ ] **Step 3: 가게명 필드에 안내 멘트 추가 + 전화번호 입력 추가**

가게명 `</div>`(Input 닫힘) 직전, Input 다음에 헬프 텍스트 추가:

```tsx
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
```

가게명 블록 `</div>` 바로 다음에 전화번호 블록 추가:

```tsx
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
```

- [ ] **Step 4: completeRegistration 호출에 phoneNumber 전달**

`handleComplete`의 `completeRegistration({ ... })` 객체에 추가:

```typescript
      name: name.trim(),
      phoneNumber: phone.replace(/\D/g, ''),
```

- [ ] **Step 5: 타입체크**

Run: `npx tsc --noEmit -p tsconfig.json 2>&1 | head`
Expected: 0 errors (onboarding 관련).

- [ ] **Step 6: 커밋 (B1+B2)**

```bash
git add src/app/onboarding/actions.ts src/app/onboarding/onboarding-form.tsx
git commit -m "feat(web): 온보딩 전화번호 필수 입력 + 가게명 정확 입력 안내

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Phase C — web: 기능 소개 캐러셀 (3-step)

### Task C1: 캐러셀 컴포넌트 + 테스트

**Files:**
- Create: `src/app/onboarding/feature-intro-carousel.tsx`
- Create: `src/app/onboarding/__tests__/feature-intro-carousel.test.tsx`

- [ ] **Step 1: 실패하는 테스트 작성**

`src/app/onboarding/__tests__/feature-intro-carousel.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { FeatureIntroCarousel } from '../feature-intro-carousel'

describe('FeatureIntroCarousel', () => {
  it('첫 화면은 첫 슬라이드와 "다음" 버튼을 보여준다', () => {
    render(<FeatureIntroCarousel onComplete={vi.fn()} isSubmitting={false} />)
    expect(screen.getByText('장부 정리, 이제 flori 하나로 끝')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '다음' })).toBeInTheDocument()
  })

  it('마지막 슬라이드에서 버튼이 "시작하기"로 바뀌고 onComplete를 호출한다', () => {
    const onComplete = vi.fn()
    render(<FeatureIntroCarousel onComplete={onComplete} isSubmitting={false} />)
    const next = () => fireEvent.click(screen.getByRole('button', { name: /다음|시작하기/ }))
    next(); next(); next() // 4슬라이드 → 3번 다음
    const start = screen.getByRole('button', { name: '시작하기' })
    expect(start).toBeInTheDocument()
    fireEvent.click(start)
    expect(onComplete).toHaveBeenCalledTimes(1)
  })

  it('isSubmitting이면 시작하기 버튼이 비활성화된다', () => {
    render(<FeatureIntroCarousel onComplete={vi.fn()} isSubmitting={true} />)
    const next = () => fireEvent.click(screen.getByRole('button', { name: /다음|시작하기/ }))
    next(); next(); next()
    expect(screen.getByRole('button', { name: /시작하기|저장하는 중/ })).toBeDisabled()
  })
})
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npm test -- feature-intro-carousel`
Expected: FAIL — 모듈 없음.

- [ ] **Step 3: 캐러셀 구현**

`src/app/onboarding/feature-intro-carousel.tsx` (시안 `.scratch/onboarding-intro-mockup.html` 기반, 라이브 4기능):

```tsx
'use client'

import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface Slide {
  eyebrow: string
  headline: string
  body: string
  emoji: string
}

const SLIDES: Slide[] = [
  {
    eyebrow: '매출 · 지출',
    headline: '장부 정리, 이제 flori 하나로 끝',
    body: '현금·카드 매출과 지출을 톡톡 기록하면 카테고리별·월별 통계로 한눈에 정리돼요.',
    emoji: '📒',
  },
  {
    eyebrow: '예약 캘린더',
    headline: '예약도 리마인더도 놓치지 않게',
    body: '예약을 캘린더에 등록하면 픽업·배송 전에 푸시 알림으로 챙겨드려요.',
    emoji: '🗓️',
  },
  {
    eyebrow: '고객 · 사진첩',
    headline: '단골 손님과 내 작품을 한 곳에',
    body: '고객별 구매 이력을 기록하고, 완성한 꽃 작품은 사진첩에 모아 관리하세요.',
    emoji: '🌷',
  },
  {
    eyebrow: '사장님 커뮤니티',
    headline: '꽃집 사장님들과 혼자가 아니에요',
    body: '전국 꽃집 사장님들과 운영 노하우를 나누는 커뮤니티. 사업자 인증 후 참여할 수 있어요.',
    emoji: '💬',
  },
]

export function FeatureIntroCarousel({
  onComplete,
  isSubmitting,
}: {
  onComplete: () => void
  isSubmitting: boolean
}) {
  const [index, setIndex] = useState(0)
  const last = index === SLIDES.length - 1
  const slide = SLIDES[index]

  const next = () => {
    if (last) {
      onComplete()
      return
    }
    setIndex((i) => Math.min(SLIDES.length - 1, i + 1))
  }

  return (
    <div className="space-y-6" aria-roledescription="carousel">
      <div
        className="rounded-2xl border border-border bg-card p-8 text-center"
        aria-label={`${index + 1} / ${SLIDES.length}: ${slide.eyebrow}`}
      >
        <div className="mb-5 flex h-28 items-center justify-center text-6xl" aria-hidden="true">
          {slide.emoji}
        </div>
        <p className="mb-2 text-xs font-bold uppercase tracking-wider text-brand">{slide.eyebrow}</p>
        <h2 className="mb-3 text-xl font-bold text-foreground break-keep">{slide.headline}</h2>
        <p className="mx-auto max-w-xs text-sm leading-relaxed text-muted-foreground break-keep">
          {slide.body}
        </p>
      </div>

      <div className="flex items-center justify-center gap-2" role="tablist" aria-label="슬라이드 인디케이터">
        {SLIDES.map((s, i) => (
          <button
            key={s.eyebrow}
            type="button"
            role="tab"
            aria-selected={i === index}
            aria-label={`${i + 1}번 슬라이드로 이동`}
            onClick={() => setIndex(i)}
            className={cn(
              'h-1.5 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              i === index ? 'w-6 bg-brand' : 'w-2 bg-border',
            )}
          />
        ))}
      </div>

      <Button type="button" className="h-11 w-full" onClick={next} disabled={isSubmitting}>
        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />}
        {isSubmitting ? '저장하는 중...' : last ? '시작하기' : '다음'}
      </Button>
    </div>
  )
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npm test -- feature-intro-carousel`
Expected: PASS (3 tests)

- [ ] **Step 5: 커밋**

```bash
git add src/app/onboarding/feature-intro-carousel.tsx src/app/onboarding/__tests__/feature-intro-carousel.test.tsx
git commit -m "feat(web): 온보딩 기능 소개 캐러셀 컴포넌트

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task C2: 폼을 3-step으로 확장 + 제출 타이밍 이동

**Files:**
- Modify: `src/app/onboarding/onboarding-form.tsx`

- [ ] **Step 1: step 타입·StepIndicator 3칸화**

`useState<1 | 2>(1)` → `useState<1 | 2 | 3>(1)`. `StepIndicator`를 3칸으로:

```tsx
function StepIndicator({ step }: { step: 1 | 2 | 3 }) {
  return (
    <div className="flex items-center justify-center gap-2" aria-label={`3단계 중 ${step}단계`}>
      {[1, 2, 3].map((n) => (
        <span
          key={n}
          className={cn('h-1.5 w-8 rounded-full transition-colors', step >= n ? 'bg-brand' : 'bg-border')}
          aria-hidden="true"
        />
      ))}
    </div>
  )
}
```

- [ ] **Step 2: import 추가**

상단 import에:

```tsx
import { FeatureIntroCarousel } from './feature-intro-carousel'
```

- [ ] **Step 3: Step2 버튼을 "다음"(→Step3)으로, 제출 분리**

Step2 폼의 `onSubmit`을 제출이 아닌 Step3 이동으로 변경하고, 하단 버튼 영역을 수정한다. Step2 `<form onSubmit>`:

```tsx
          <form
            onSubmit={(e) => {
              e.preventDefault()
              setStep(3)
            }}
            className="space-y-6"
          >
```

하단 "완료" submit 버튼을 "다음"으로 바꾸고, "건너뛰기"는 Step3로 이동(제출 아님):

```tsx
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                className="h-10 flex-1"
                onClick={() => { setError(null); setStep(1) }}
              >
                <ArrowLeft className="w-4 h-4 mr-1" aria-hidden="true" />
                이전
              </Button>
              <Button type="submit" className="h-10 flex-1">
                다음
              </Button>
            </div>

            <Button
              type="button"
              variant="ghost"
              className="h-9 w-full text-muted-foreground"
              onClick={() => { setError(null); setStep(3) }}
            >
              건너뛰기
            </Button>
```

(Step2의 `fieldset disabled={isLoading}`·`isLoading` 의존은 제거 — 제출은 Step3에서.)

- [ ] **Step 4: Step3 렌더 추가**

`step === 1 ? (...) : (...)` 삼항을 step별 분기로 바꾼다. 가장 간단하게 Step2 블록 뒤를 다음 구조로:

```tsx
        {step === 1 ? (
          /* ... Step1 form ... */
        ) : step === 2 ? (
          /* ... Step2 form ... */
        ) : (
          <FeatureIntroCarousel onComplete={() => void handleComplete()} isSubmitting={isLoading} />
        )}
```

- [ ] **Step 5: handleComplete 에러 분기 시 Step 복귀값 점검**

`handleComplete` 내 `setStep(1)`(email/nickname 충돌)·`setStep(2)` 경로는 그대로 유효. step3에서 호출되므로 변경 불필요. 단 `handleComplete` 진입 가드 `if (!step1Valid) { setStep(1); ... }` 유지.

- [ ] **Step 6: 타입체크 + 기존 onboarding 테스트(있으면) 확인**

Run: `npx tsc --noEmit 2>&1 | head` 및 `npm test -- onboarding`
Expected: 0 type errors. 기존 테스트 통과(없으면 skip).

- [ ] **Step 7: 수동 확인(선택) — dev 서버**

Run: `npm run dev` 후 `/onboarding`(registerToken 필요)에서 3-step 흐름 육안 확인. (registerToken 없으면 코드 리뷰로 대체.)

- [ ] **Step 8: 커밋**

```bash
git add src/app/onboarding/onboarding-form.tsx
git commit -m "feat(web): 온보딩 3-step 확장 — 기능 소개 후 가입 완료

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Phase D — api: 커뮤니티 authorIsAdmin

### Task D1: PostResponse/CommentResponse에 authorIsAdmin 추가

**Files:**
- Modify: `src/main/kotlin/kr/ai/flori/community/dto/CommunityDtos.kt`

- [ ] **Step 1: PostResponse 필드 + of 파라미터 추가**

`PostResponse` data class에서 `authorNickname` 다음에 `val authorIsAdmin: Boolean,` 추가. `of(...)`에 `authorIsAdmin: Boolean` 파라미터 추가하고 생성자에 `authorIsAdmin = authorIsAdmin,` 전달:

```kotlin
data class PostResponse(
    val id: Long,
    val authorNickname: String,
    val authorIsAdmin: Boolean,
    val category: String,
    ...
) {
    companion object {
        fun of(
            post: CommunityPost,
            authorNickname: String,
            authorIsAdmin: Boolean,
            liked: Boolean,
            isMine: Boolean,
            canView: Boolean,
        ): PostResponse =
            PostResponse(
                id = requireNotNull(post.id),
                authorNickname = authorNickname,
                authorIsAdmin = authorIsAdmin,
                category = post.category,
                ...
            )
    }
}
```

- [ ] **Step 2: CommentResponse 동일 적용**

`CommentResponse`에 `val authorIsAdmin: Boolean,`(authorNickname 다음), `of(...)`에 파라미터 + 전달 추가.

- [ ] **Step 3: 커밋 보류 — Task D2와 함께(컴파일 D2에서 통과)**

---

### Task D2: CommunityService — 작성자 isAdmin 조회·전달

**Files:**
- Modify: `src/main/kotlin/kr/ai/flori/community/service/CommunityService.kt`

- [ ] **Step 1: 작성자 User 배치 조회 헬퍼 추가**

`nicknamesOf` 옆(내부 헬퍼 영역)에 추가:

```kotlin
    private fun authorsOf(userIds: Collection<Long>): Map<Long, User> {
        if (userIds.isEmpty()) return emptyMap()
        return userRepository
            .findAllById(userIds.toSet())
            .associateBy { requireNotNull(it.id) }
    }
```

(`import kr.ai.flori.user.entity.User` 추가.)

- [ ] **Step 2: listPosts — authors 맵으로 nickname+isAdmin 전달**

`listPosts`의 `nicknamesOf(...)` 사용부를 authors 맵으로 교체:

```kotlin
        val authors = authorsOf(posts.map { it.authorUserId })
        ...
        posts.map { post ->
            val author = authors[post.authorUserId]
            PostResponse.of(
                post = post,
                authorNickname = author?.nickname ?: UNKNOWN_NICKNAME,
                authorIsAdmin = author?.isAdmin ?: false,
                liked = post.id in likedIds,
                isMine = post.authorUserId == viewer.id,
                canView = canViewPost(post, viewer),
            )
        }
```

- [ ] **Step 3: getPost — 단건 작성자 조회**

```kotlin
        val author = authorsOf(listOf(post.authorUserId))[post.authorUserId]
        return PostResponse.of(
            post = post,
            authorNickname = author?.nickname ?: UNKNOWN_NICKNAME,
            authorIsAdmin = author?.isAdmin ?: false,
            liked = likeRepository.existsByPostIdAndUserId(id, viewer.id),
            isMine = post.authorUserId == viewer.id,
            canView = canViewPost(post, viewer),
        )
```

- [ ] **Step 4: createPost 응답 — viewer가 작성자**

`PostResponse.of(saved, nicknameOf(viewer.id), liked = false, isMine = true, canView = true)` (약 line 116)를:

```kotlin
        return PostResponse.of(saved, nicknameOf(viewer.id), authorIsAdmin = viewer.isAdmin, liked = false, isMine = true, canView = true)
```

- [ ] **Step 5: 그 외 post .of 호출부(약 line 137) 반영**

해당 위치의 `authorNickname = nicknameOf(saved.authorUserId),` 블록에 `authorIsAdmin = authorsOf(listOf(saved.authorUserId))[saved.authorUserId]?.isAdmin ?: false,` 추가(작성자가 viewer면 `viewer.isAdmin`로 단순화 가능 — 문맥 확인 후 선택).

- [ ] **Step 6: listComments — authors 맵 적용**

`nicknamesOf(comments.map { it.authorUserId })` → `authorsOf(...)` 로 바꾸고 각 `CommentResponse.of`에 `authorIsAdmin = author?.isAdmin ?: false` 전달(nickname도 author?.nickname).

- [ ] **Step 7: createComment 응답(약 line 240)**

`CommentResponse.of(saved, nicknameOf(viewer.id), isMine = true, canView = true)` →

```kotlin
        return CommentResponse.of(saved, nicknameOf(viewer.id), authorIsAdmin = viewer.isAdmin, isMine = true, canView = true)
```

- [ ] **Step 8: 빌드 확인**

Run: `cd /Users/hansangho/Desktop/flori-ai/api && ./gradlew compileKotlin -q`
Expected: BUILD SUCCESSFUL

- [ ] **Step 9: 커밋 (D1+D2)**

```bash
git add src/main/kotlin/kr/ai/flori/community/dto/CommunityDtos.kt src/main/kotlin/kr/ai/flori/community/service/CommunityService.kt
git commit -m "feat(api): 커뮤니티 응답에 작성자 운영자 여부(authorIsAdmin) 추가

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task D3: 커뮤니티 authorIsAdmin 테스트

**Files:**
- Test: 기존 커뮤니티 통합/Docs 테스트 파일 (`src/test/kotlin/kr/ai/flori/community/...`)

- [ ] **Step 1: 테스트 위치 파악**

Run: `cd /Users/hansangho/Desktop/flori-ai/api && ls src/test/kotlin/kr/ai/flori/community 2>/dev/null; grep -rln "authorNickname\|/community/posts" src/test/kotlin/kr/ai/flori/community`
기존 게시글 응답 단언이 있는 테스트 파일을 대상으로 한다.

- [ ] **Step 2: 운영자 작성 글 authorIsAdmin=true 테스트 추가**

```kotlin
@Test
fun `운영자가 쓴 글은 authorIsAdmin이 true`() {
    // given: is_admin=true 유저로 글 작성
    val adminPostId = createPostAs(adminUser, category = "notice")
    // when: 목록/상세 조회
    mockMvc.perform(get("/community/posts/$adminPostId").withAuth(adminUser))
        .andExpect(status().isOk)
        .andExpect(jsonPath("$.authorIsAdmin").value(true))
}

@Test
fun `일반 점주가 쓴 글은 authorIsAdmin이 false`() {
    val postId = createPostAs(normalUser, category = "daily")
    mockMvc.perform(get("/community/posts/$postId").withAuth(normalUser))
        .andExpect(status().isOk)
        .andExpect(jsonPath("$.authorIsAdmin").value(false))
}
```

(`createPostAs`/`withAuth`/`adminUser`/`normalUser`는 해당 테스트 파일의 기존 헬퍼·픽스처에 맞춰 사용. 없으면 기존 테스트의 setup 패턴을 따른다.)

- [ ] **Step 3: RestDocs 필드 문서에 authorIsAdmin 추가**

게시글/댓글 응답 필드 스니펫에 `fieldWithPath("authorIsAdmin").description("작성자 운영자 여부")` 추가(목록은 `posts[].authorIsAdmin`).

- [ ] **Step 4: 테스트 통과 + OpenAPI 갱신**

Run: `./gradlew test --tests "*Community*" -q`
Expected: PASS. 이후 `./gradlew test -q`로 OpenAPI 스냅샷 갱신.

- [ ] **Step 5: 커밋**

```bash
git add src/test/kotlin/kr/ai/flori/community src/main/resources/static/docs/open-api-3.0.1.json
git commit -m "test(api): 커뮤니티 authorIsAdmin 응답 테스트 + OpenAPI 갱신

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Phase E — web: 커뮤니티 인증 패스 + 관리자 칩

### Task E1: ensureCommunityAccess 헬퍼

**Files:**
- Modify: `src/lib/actions/business-verification.ts`

- [ ] **Step 1: import 추가 (파일 상단)**

파일 상단 기존 import 블록에 다음을 추가(이미 있으면 중복 추가 금지 — 기존 라인 확인):

```typescript
import { redirect } from 'next/navigation';
import { checkIsAdmin } from '@/lib/admin-guard';
```

- [ ] **Step 2: 헬퍼 함수 추가 (파일 끝)**

`business-verification.ts`는 `'use server'` 파일이므로 모든 export는 async 함수여야 한다(`ensureCommunityAccess`는 async — OK). 파일 끝에:

```typescript
/**
 * 커뮤니티 접근 게이트. 운영자(is_admin)는 사업자 인증 없이 통과한다.
 * 그 외에는 사업자 인증 APPROVED여야 하며, 아니면 /admin/community/verify로 리다이렉트.
 */
export async function ensureCommunityAccess(): Promise<void> {
  if (await checkIsAdmin()) return;
  const verification = await getMyBusinessVerification();
  if (verification.status !== 'APPROVED') redirect('/admin/community/verify');
}
```

- [ ] **Step 3: 타입체크**

Run: `npx tsc --noEmit 2>&1 | head`
Expected: 0 errors.

- [ ] **Step 4: 커밋**

```bash
git add src/lib/actions/business-verification.ts
git commit -m "feat(web): 운영자 커뮤니티 인증 패스 헬퍼 ensureCommunityAccess

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task E2: 게이트 4곳을 헬퍼로 교체

**Files:**
- Modify: `src/app/(admin)/admin/community/page.tsx`
- Modify: `src/app/(admin)/admin/community/write/page.tsx`
- Modify: `src/app/(admin)/admin/community/[id]/page.tsx`
- Modify: `src/app/(admin)/admin/community/[id]/edit/page.tsx`

- [ ] **Step 1: 각 페이지에서 인라인 게이트 → 헬퍼 호출**

4개 파일 각각에서 다음 두 줄

```typescript
  const verification = await getMyBusinessVerification();
  if (verification.status !== 'APPROVED') redirect('/admin/community/verify');
```

을 다음 한 줄로 교체:

```typescript
  await ensureCommunityAccess();
```

import 수정: `import {getMyBusinessVerification} from '@/lib/actions/business-verification';` → `import {ensureCommunityAccess} from '@/lib/actions/business-verification';`. 더 이상 `redirect`를 쓰지 않게 되면(특히 `page.tsx`/`write/page.tsx`) 미사용 import 제거. `[id]/page.tsx`·`[id]/edit/page.tsx`는 `notFound`/`redirect`를 여전히 쓰므로 `redirect` 유지 확인.

- [ ] **Step 2: 타입체크 + 미사용 import 린트**

Run: `npx tsc --noEmit 2>&1 | head && npm run lint 2>&1 | grep -i community | head`
Expected: 0 errors, community 관련 린트 경고 없음.

- [ ] **Step 3: 커밋**

```bash
git add "src/app/(admin)/admin/community/page.tsx" "src/app/(admin)/admin/community/write/page.tsx" "src/app/(admin)/admin/community/[id]/page.tsx" "src/app/(admin)/admin/community/[id]/edit/page.tsx"
git commit -m "feat(web): 커뮤니티 게이트를 ensureCommunityAccess로 통일(운영자 패스)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task E3: 타입 + 매퍼에 author_is_admin

**Files:**
- Modify: `src/types/database.ts`
- Modify: `src/lib/actions/community.ts`

- [ ] **Step 1: 타입 추가**

`CommunityPost`·`CommunityComment` 인터페이스의 `author_nickname` 다음에:

```typescript
  author_is_admin: boolean;
```

- [ ] **Step 2: DTO 미러 + 매퍼 반영**

`community.ts`의 `PostResponseDto`·`CommentResponseDto`에 `authorIsAdmin: boolean;` 추가(authorNickname 다음). `toPost`·`toComment` 매퍼에:

```typescript
    author_nickname: dto.authorNickname,
    author_is_admin: dto.authorIsAdmin,
```

- [ ] **Step 3: 타입체크**

Run: `npx tsc --noEmit 2>&1 | head`
Expected: post-card 등 칩 미사용은 에러 아님. 0 errors.

- [ ] **Step 4: 커밋 보류 — E4와 함께(칩 컴포넌트 추가 후)**

---

### Task E4: 관리자 배지 컴포넌트 + 4개 렌더 지점

**Files:**
- Create: `src/components/community/admin-badge.tsx`
- Modify: `src/components/community/post-card.tsx`
- Modify: `src/components/community/comment-tree.tsx`
- Modify: `src/app/(admin)/admin/community/community-client.tsx`
- Modify: `src/app/(admin)/admin/community/[id]/community-detail-client.tsx`
- Test: `src/components/__tests__/post-card.test.tsx`

- [ ] **Step 1: 배지 컴포넌트 작성**

`src/components/community/admin-badge.tsx` (브랜드색, 다크 대응 토큰 사용 — 인라인 색상 금지):

```tsx
import { ShieldCheck } from 'lucide-react'
import { cn } from '@/lib/utils'

/** 운영자 작성물에 표시하는 "관리자" 칩. */
export function AdminBadge({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-0.5 rounded-md bg-brand/10 px-1.5 py-0.5 text-[10px] font-semibold text-brand',
        className,
      )}
    >
      <ShieldCheck className="h-3 w-3" aria-hidden="true" />
      관리자
    </span>
  )
}
```

- [ ] **Step 2: post-card.test.tsx에 실패 테스트 추가**

기존 mock post 객체에 `author_is_admin` 필드를 쓰는 케이스 추가:

```tsx
it('운영자 글이면 관리자 칩을 보여준다', () => {
  render(<PostCard post={{ ...basePost, author_is_admin: true }} />)
  expect(screen.getByText('관리자')).toBeInTheDocument()
})
it('일반 글이면 관리자 칩이 없다', () => {
  render(<PostCard post={{ ...basePost, author_is_admin: false }} />)
  expect(screen.queryByText('관리자')).not.toBeInTheDocument()
})
```

(기존 mock 객체 리터럴 `{ id: '1', author_nickname: ... }`을 `basePost`로 추출하거나, 인라인이면 `author_is_admin: false` 기본 추가. 기존 테스트의 타입 통과 위해 mock에 `author_is_admin` 필수 추가.)

- [ ] **Step 3: 테스트 실패 확인**

Run: `npm test -- post-card`
Expected: FAIL — 칩 미렌더.

- [ ] **Step 4: post-card.tsx 렌더**

작성자 닉네임 `<span>`(약 line 32-34) 다음에 칩 추가. import: `import { AdminBadge } from '@/components/community/admin-badge'`:

```tsx
        <span className="font-medium text-foreground/70">
          {masked ? '비공개' : post.author_nickname}
        </span>
        {!masked && post.author_is_admin && <AdminBadge />}
```

- [ ] **Step 5: 나머지 3개 렌더 지점 적용**

`comment-tree.tsx`(약 line 109) — 닉네임 span 다음:

```tsx
              <span className="font-medium text-foreground">{comment.author_nickname}</span>
              {comment.author_is_admin && <AdminBadge />}
```

`community-client.tsx`(약 line 148) — `<span>{masked ? '비공개' : post.author_nickname}</span>` 다음:

```tsx
          <span>{masked ? '비공개' : post.author_nickname}</span>
          {!masked && post.author_is_admin && <AdminBadge />}
```

`[id]/community-detail-client.tsx`(약 line 100) — 닉네임 span 다음:

```tsx
              <span className="font-medium text-foreground/80">{post.author_nickname}</span>
              {post.author_is_admin && <AdminBadge />}
```

각 파일 상단에 `import { AdminBadge } from '@/components/community/admin-badge'` 추가.

- [ ] **Step 6: 테스트 + 타입체크 통과 확인**

Run: `npm test -- post-card && npx tsc --noEmit 2>&1 | head`
Expected: PASS, 0 type errors.

- [ ] **Step 7: 커밋 (E3+E4)**

```bash
git add src/types/database.ts src/lib/actions/community.ts src/components/community/admin-badge.tsx src/components/community/post-card.tsx src/components/community/comment-tree.tsx "src/app/(admin)/admin/community/community-client.tsx" "src/app/(admin)/admin/community/[id]/community-detail-client.tsx" src/components/__tests__/post-card.test.tsx
git commit -m "feat(web): 커뮤니티 운영자 작성물에 관리자 칩 표시

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Phase F — 최종 검증

### Task F1: 전체 테스트 + 린트

- [ ] **Step 1: web 전체 테스트**

Run: `npm test`
Expected: 모든 테스트 통과(기존 526 + 신규).

- [ ] **Step 2: web 린트**

Run: `npm run lint`
Expected: 0 errors.

- [ ] **Step 3: api 전체 테스트**

Run: `cd /Users/hansangho/Desktop/flori-ai/api && ./gradlew test -q`
Expected: BUILD SUCCESSFUL.

- [ ] **Step 4: 스펙 대조 체크**

스펙 `docs/superpowers/specs/26-06-08-onboarding-phone-intro-admin-design.md`의 3개 기능이 모두 구현됐는지 확인:
- [ ] 온보딩 전화번호 필수(web+api) + 가게명 안내
- [ ] 기능 소개 캐러셀(3-step, 라이브 4기능)
- [ ] 운영자 커뮤니티 패스 + 관리자 칩(모든 뷰어)

---

## 주의사항 / 리스크

- **web↔api 계약 동기**: 전화번호 필수는 양쪽 동시 배포 필요. api가 phoneNumber 필수가 되면 구버전 web은 가입 실패 → 배포 순서 조율(api 먼저 배포 시 구버전 web 깨짐, web 먼저면 api가 아직 필드 무시). 가능하면 동시 머지/배포.
- **기존 데이터 백필**: `phone_number` NOT NULL. 마이그레이션은 기존 행에 `''`를 넣으므로(임시 default) 위반은 안 나지만, 운영자가 실제 번호로 백필해야 한다(사전 합의).
- **제출 타이밍 이동**: "건너뛰기"가 더 이상 가입 완료가 아님 — Step3 캐러셀의 "시작하기"가 유일한 제출. 의도된 UX.
- **린트 `transition-all` 금지**: 캐러셀/배지에 개별 속성 transition만 사용(이미 반영).
