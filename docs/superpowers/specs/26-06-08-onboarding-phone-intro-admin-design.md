# 온보딩 개선 + 슈퍼어드민 커뮤니티 패스/관리자 칩 — 설계

> 작성일 2026-06-08 · 브랜치 `worktree-onboarding-console` (web, dev 기준) + api 단일 브랜치
> 범위: web(Next.js) + api(Kotlin). 두 레포에 걸친 작업.

## 배경 / 목표

소셜 신규 가입 온보딩과 슈퍼어드민(운영자)의 커뮤니티 경험을 개선한다.

1. **온보딩 — 전화번호 필수 입력 추가** + 가게명 정확 입력 안내
2. **온보딩 — 기능 소개 캐러셀**(마지막 단계)로 라이브 기능을 안내
3. **슈퍼어드민 — 커뮤니티 사업자 인증 패스** + 운영자 작성물에 **관리자 칩** 상시 표시

비목표(YAGNI): 인사이트/AI 등 현재 비활성화된 기능은 캐러셀에 넣지 않는다. 전화번호 형식 국제화·SMS 인증은 범위 밖.

---

## 1. 온보딩 — 전화번호 필수 + 가게명 안내

### web

`src/app/onboarding/onboarding-form.tsx`
- Step 1에 `phoneNumber` 입력 추가 (가게명 바로 아래 배치 — 사업자/연락 정보 묶음).
  - `type="tel"`, `inputMode="numeric"`, `autoComplete="tel"`, placeholder `010-1234-5678`.
  - 입력 시 자동 하이픈 포맷: 숫자만 추출 후 `010-XXXX-XXXX` 형태로 표시. 상태에는 **표시 문자열**을 두고, 검증·전송 시 `replace(/\D/g, '')`로 숫자만 사용.
  - 검증 정규식: `/^01\d{8,9}$/` (10~11자리). 유효하지 않으면 인라인 에러.
- `step1Valid` 조건에 전화번호 유효성 추가.
- **가게명 안내 멘트**: 가게명 `Label` 아래 헬프 텍스트 `text-xs text-muted-foreground` 추가 —
  "사업자등록증의 상호와 동일하게 정확히 입력해 주세요." (커뮤니티 사업자 인증 매칭을 고려한 안내).

`src/app/onboarding/actions.ts`
- `RegistrationInput`에 `phoneNumber: string` 추가(필수).
- `completeRegistration`: 숫자만 추출한 값으로 서버 검증(`/^01\d{8,9}$/`), body에 `phoneNumber` 포함(필수 전송).
- 누락/형식 오류 시 `{kind:'unknown'}` 또는 신규 분기로 Step1 복귀 + 인라인 에러.

### api (Kotlin, 단일 브랜치)

- `User` 엔티티: `phone_number` 컬럼 추가 — **NOT NULL** (기존 데이터는 사용자가 수동 백필).
  - DB 마이그레이션 스크립트(프로젝트의 기존 마이그레이션 방식 따름) 추가.
- `RegisterCompleteRequest` DTO(`auth/dto/AuthDtos.kt`): `phoneNumber: String` 추가 + 검증(`@Pattern` 또는 서비스단 정규식 `^01\d{8,9}$`).
- `AuthService` register/complete 로직: `phoneNumber` 저장.
- RestDocs / 통합 테스트(`RegisterCompleteDocsTest`, `AuthFlowIntegrationTest`, `OnboardingApiIntegrationTest`) 갱신 — 새 필수 필드 반영.
- OpenAPI 스냅샷(`static/docs/open-api-3.0.1.json`) 갱신.

---

## 2. 온보딩 — 기능 소개 캐러셀 (마지막 단계)

현재 2-step → **3-step**으로 확장. 시안: `.scratch/onboarding-intro-mockup.html` (4페이지 스와이프).

### 제출 타이밍 이동 (핵심)

현재 `completeRegistration`은 Step2의 "완료/건너뛰기"에서 실행된다.
- **Step2 버튼**: "완료" → **"다음"**(Step3로 이동). "건너뛰기"는 선택 항목 스킵 후 Step3로(제출 아님).
- **Step3 마지막 페이지 버튼**: "시작하기" → 여기서 `completeRegistration` 실행 → `/admin`.
- Step3 진입 후에도 "이전"으로 Step2 복귀 가능.
- `isLoading`/에러 처리는 Step3 시작하기 버튼으로 이동.

### 캐러셀 컴포넌트

`src/app/onboarding/feature-intro-carousel.tsx` (신규, 클라이언트)
- props: `onComplete: () => void`, `isSubmitting: boolean`.
- 4개 슬라이드(라이브 기능 기준, 정확성 검증 완료):
  1. **매출·지출** — "장부 정리, flori 하나로 끝" / 매출·지출 기록 → 카테고리·월별 통계.
  2. **예약 캘린더** — "예약도 리마인더도 놓치지 않게" / 예약 등록 → 픽업 전 푸시 알림.
  3. **고객·사진첩** — "단골 손님과 내 작품을 한 곳에" / 고객 이력 + 사진첩 포트폴리오.
  4. **사장님 커뮤니티** — "꽃집 사장님들과 혼자가 아니에요" / 노하우 공유(사업자 인증 후).
- 인터랙션: 좌우 스와이프(touch) + dot 인디케이터. 마지막 페이지에서 버튼 "다음"→"시작하기".
- 접근성: 슬라이드 영역 `aria-roledescription="carousel"`, 각 슬라이드 `aria-label`, dot 버튼 `aria-label`. `transition-all` 금지(개별 속성 transition).
- 스타일: 브랜드 팔레트(`--brand`/`--sage`), 카드 순백 배경. 다크 모드 대응(온보딩이 다크 노출되면 토큰 사용).

### StepIndicator

- 2칸 → 3칸으로 확장. `step: 1 | 2 | 3`.

> **금지 사항 준수**: 엔터키 제출 방지(폼 onSubmit preventDefault 유지), 한국어 UI.

---

## 3. 슈퍼어드민 — 커뮤니티 인증 패스 + 관리자 칩

### 3a. 사업자 인증 게이트 패스

게이트 위치(4곳): `community/page.tsx`, `community/write/page.tsx`, `community/[id]/page.tsx`, `community/[id]/edit/page.tsx`.

- 공용 헬퍼 도입 — `lib/actions/business-verification.ts`에
  `export async function ensureCommunityAccess(): Promise<void>`:
  - `checkIsAdmin()`가 true면 즉시 통과(리다이렉트 없음).
  - 아니면 `getMyBusinessVerification()` → `status !== 'APPROVED'`면 `redirect('/admin/community/verify')`.
- 각 페이지의 인라인 게이트를 이 헬퍼 호출로 교체(중복 제거).
- `verify/page.tsx`는 범위 밖(직접 접근 시에도 운영자 통과 처리는 선택 — 이번엔 게이트 4곳만; 운영자가 verify 페이지를 직접 열 일은 없음).

> 진짜 권한 검증은 서버 `@RequiresAdmin`/커뮤니티 서비스의 `viewer.isAdmin`이 이미 수행. 이 패스는 프론트 진입 차단 해제용.

### 3b. 관리자 칩 (운영자 작성물 상시 표시)

운영자가 작성한 **게시글·댓글**에 모든 뷰어가 보는 "관리자" 칩을 닉네임 옆에 표시한다.

#### api

- `PostResponse`·`CommentResponse` DTO(`community/dto/CommunityDtos.kt`)에 `authorIsAdmin: Boolean` 추가.
- `CommunityService`: 현재 `nicknamesOf(authorUserIds)` 배치 조회 옆에 작성자 `isAdmin` 배치 조회 추가
  (예: `adminFlagsOf(userIds): Map<Long, Boolean>` 또는 user 조회를 nickname+isAdmin 한 번에 묶어 반환).
  `PostResponse.of`/`CommentResponse.of`에 `authorIsAdmin` 전달.
  - 적용 지점: `listPosts`, `getPost`, 글 작성 응답, `listComments`, 댓글 작성 응답 등 작성자 닉네임을 채우는 모든 경로.
- 테스트: 운영자 작성 글/댓글에서 `authorIsAdmin=true` 검증.

#### web

- 타입(`types/database.ts`): `CommunityPost`·`CommunityComment`에 `author_is_admin: boolean` 추가.
- 매퍼(`lib/actions/community.ts`): BFF `authorIsAdmin` → `author_is_admin` 매핑.
- 렌더: 작성자 닉네임이 표시되는 곳에 `author_is_admin`이면 "관리자" 칩 노출.
  - 후보 컴포넌트: 게시글 카드(`components/community/post-card.tsx` 등), 게시글 상세 헤더, 댓글 트리(`comment-tree`).
  - 칩 스타일: `DomainBadge` 또는 브랜드색 작은 배지(다크 대응 위해 인라인 `style` 금지 — `DomainBadge`/토큰 클래스 사용).

---

## 데이터 흐름 요약

```
온보딩: page.tsx(서버) → OnboardingForm(클라)
  Step1(가게명·전화번호·닉네임·이메일·지역) → Step2(선택) → Step3(캐러셀)
  → "시작하기" → completeRegistration(actions) → BFF POST /auth/register/complete(+phoneNumber) → /admin

커뮤니티 진입: page.tsx(서버) → ensureCommunityAccess()
  isAdmin? 통과 : status APPROVED? 통과 : redirect(/verify)

관리자 칩: BFF PostResponse/CommentResponse.authorIsAdmin → web author_is_admin → 칩 렌더
```

## 테스트 전략

- **web**: 온보딩 폼 검증(전화번호 정규식·step 전이·제출 타이밍) 유닛 테스트. `ensureCommunityAccess` 분기 테스트. 매퍼 `author_is_admin` 매핑 테스트. 캐러셀 상호작용(마지막 페이지 버튼 전환) 테스트.
- **api**: register/complete phoneNumber 필수 검증 + 저장. 커뮤니티 응답 `authorIsAdmin` 통합 테스트. 기존 테스트(필수 필드 추가) 회귀 수정.
- 베이스라인: web 526 tests green (현재).

## 리스크 / 주의

- **두 레포 동기 배포**: 전화번호 필수는 web↔api 계약 변경. api가 phoneNumber 필수가 되면, 기존 web(미전송)과 호환 안 됨 → 배포 순서/동시성 주의. (이번 작업은 둘 다 같이 진행.)
- **기존 유저 백필**: `phone_number` NOT NULL — 기존 행은 사용자가 수동 채움(사전 합의됨). 마이그레이션은 컬럼 추가 시 기존 행 처리 방식(임시 default 후 백필, 또는 빈 테이블 가정) 확인 필요.
- **제출 타이밍 이동**: Step3로 옮길 때 "건너뛰기"가 더 이상 제출이 아니므로, 선택 항목 없이도 캐러셀을 거쳐야 가입 완료됨(의도된 UX).
