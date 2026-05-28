# flori

> 꽃집 매출·지출·고객·예약·인사이트를 한 곳에서 관리하는 멀티테넌트 PWA 어드민

![Next.js](https://img.shields.io/badge/Next.js-16-000000?logo=nextdotjs)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL%20%2B%20RLS-3FCF8E?logo=supabase&logoColor=white)
![Vercel](https://img.shields.io/badge/Deploy-Vercel-000000?logo=vercel)

---

## 목차

- [Quick Start](#quick-start)
- [환경 설정](#환경-설정)
- [아키텍처](#아키텍처)
- [프로젝트 구조](#프로젝트-구조)
- [멀티테넌시](#멀티테넌시)
- [주요 기능](#주요-기능)
- [CI/CD](#cicd)

---

## Quick Start

### 필수 요구사항

- Node.js 22+
- npm
- [Supabase](https://supabase.com) 프로젝트
- [Cloudflare R2](https://www.cloudflare.com/developer-platform/r2/) 버킷
- Kotlin BFF 서버 (`flori-ai/server`) — 인증/온보딩 API

### 실행

```bash
# 1. 의존성 설치
npm install

# 2. 환경변수 설정 (.env.local 생성 — 아래 표 참조)

# 3. DB 스키마 적용 (Supabase SQL Editor에서 supabase/schema.sql 실행)

# 4. 개발 서버 실행
npm run dev
```

http://localhost:3100 접속.

```bash
npm run build        # 프로덕션 빌드
npm run lint         # ESLint
npm test             # Vitest 1회 실행
npm run test:watch   # Vitest watch 모드
```

> 환경변수 값은 팀 리드에게 문의하세요.

---

## 환경 설정

`.env.local` 을 프로젝트 루트에 생성합니다. (빌드 타임에 `src/lib/env.ts` Zod 스키마로 검증 — 필수 누락 시 빌드 실패)

| 변수 | 설명 | 필수 | 기본값 |
|------|------|------|--------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase 프로젝트 URL | O | - |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon 키 | O | - |
| `SUPABASE_SERVICE_ROLE_KEY` | Service Role 키 (RLS 우회, 내부 API) | O | - |
| `R2_ACCOUNT_ID` | Cloudflare R2 계정 ID | O | - |
| `R2_ACCESS_KEY_ID` | R2 액세스 키 | O | - |
| `R2_SECRET_ACCESS_KEY` | R2 시크릿 키 | O | - |
| `R2_BUCKET_NAME` | R2 버킷명 | O | - |
| `R2_PUBLIC_URL` | R2 퍼블릭(CDN) URL | O | - |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | Web Push VAPID 공개키 | O | - |
| `INTERNAL_API_KEY` | 내부 API Bearer 키 (32자 이상) | O | - |
| `API_URL` | Kotlin BFF 베이스 URL (서버 전용) | O | `http://localhost:8080` |
| `VAPID_PRIVATE_KEY` | Web Push VAPID 비밀키 | - | - |
| `VAPID_SUBJECT` | VAPID subject (mailto/URL) | - | - |
| `DISCORD_WEBHOOK_URL` | 에러 로깅 웹훅 | - | - |
| `CRON_SECRET` | Vercel Cron 인증 시크릿 | - | - |
| `OAUTH_KAKAO_REST_API_KEY` | 카카오 OAuth (서버 전용) | - | - |
| `OAUTH_GOOGLE_CLIENT_ID` | 구글 OAuth (서버 전용) | - | - |
| `OAUTH_NAVER_CLIENT_ID` | 네이버 OAuth (서버 전용) | - | - |

> `NEXT_PUBLIC_` 접두사가 없는 변수는 서버 전용이며 브라우저에 노출하지 않습니다.

---

## 아키텍처

```mermaid
flowchart TB
    User([사용자 · PWA])

    subgraph Vercel["Vercel"]
        Next["Next.js 16 App Router\nServer Components · Server Actions · Route Handlers"]
        Cron["Vercel Cron\n예약 리마인더 · 고정비 생성"]
        SW["Service Worker\n푸시 수신"]
    end

    subgraph Backend["백엔드"]
        BFF["Kotlin BFF (flori-ai/server)\n인증 · OAuth · 비즈니스 데이터"]
        DB[("PostgreSQL\nBFF 소유")]
        Supabase[("Supabase\n직접 호출 잔존 · 이전 예정")]
        R2[("Cloudflare R2\n이미지 · CDN")]
    end

    OAuth["소셜 OAuth\nkakao · google · naver"]
    Push["Web Push\n(VAPID)"]
    Discord["Discord\n에러 로깅"]

    User --> Next
    User <-->|"브라우저 직접 PUT (presigned)"| R2
    Next -->|"JWT 쿠키 · 서버↔서버 (주 경로)"| BFF
    Next -.->|"일부 쿼리 직접 호출"| Supabase
    Next -->|"presigned URL 발급"| R2
    Next -.->|"미지 에러"| Discord
    BFF --> DB
    BFF <--> OAuth
    Cron --> Push --> SW --> User

    style Next fill:#1565c0,color:#fff
    style BFF fill:#6a1b9a,color:#fff
    style DB fill:#2e7d32,color:#fff
    style R2 fill:#ef6c00,color:#fff
```

> 상세 아키텍처 및 기술 선정 이유는 [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) 참조

### 소셜 로그인 흐름

```mermaid
sequenceDiagram
    participant C as 브라우저
    participant N as Next.js (Route Handler)
    participant O as OAuth 공급자
    participant B as Kotlin BFF

    C->>N: /auth/login/{provider}
    N->>C: state 쿠키 발급 + 공급자 redirect
    C->>O: 로그인 동의
    O->>N: /auth/callback/{provider} (code)
    N->>N: CSRF state 검증
    N->>B: POST /auth/oauth/{provider}
    alt 기존 회원 (registered=true)
        B-->>N: JWT (access/refresh)
        N->>C: flori_access/refresh 쿠키 → /admin
    else 신규 (registered=false)
        B-->>N: registerToken
        N->>C: flori_register 쿠키 → /onboarding
    end
```

- **Next.js (Vercel)**: 서버 컴포넌트 데이터 fetch, Server Action(CUD), Route Handler(OAuth/Cron/내부 API)
- **Kotlin BFF**: 인증·OAuth·온보딩 + 비즈니스 데이터의 **주 경로**. Next 서버 레이어에서 JWT 쿠키로 서버↔서버 호출(`apiFetch`)하며, BFF가 DB(PostgreSQL)를 소유하고 테넌트 격리·카드수수료 계산을 수행
- **Supabase**: Supabase → BFF **마이그레이션 진행 중**이라 일부 엔드포인트(설정·푸시 구독·인사이트 일부·매출 집계 RPC 등)는 아직 Supabase를 직접 호출
- **Cloudflare R2**: 이미지 저장. Vercel 4.5MB 본문 제한을 우회하기 위해 presigned URL 로 브라우저가 R2에 직접 PUT

---

## 프로젝트 구조

```
src/
├── app/
│   ├── (public)/          # 공개 홈페이지 (인증 불필요, /)
│   ├── (admin)/admin/     # 어드민 라우트 (인증 필요, /admin/*)
│   │   ├── sales/ expenses/ customers/
│   │   ├── gallery/ calendar/ insights/ settings/
│   ├── api/
│   │   ├── cron/          # Vercel Cron (리마인더, 고정비)
│   │   └── internal/      # 내부 API (Bearer 토큰, Service Role)
│   ├── auth/              # 소셜 OAuth Route Handlers
│   ├── onboarding/        # 소셜 신규 가입 온보딩
│   ├── policy/            # 정책 문서 (개인정보/이용약관)
│   ├── login/             # 로그인 (소셜 전용)
│   └── manifest.ts        # PWA 매니페스트
├── components/
│   ├── ui/                # shadcn/ui
│   ├── layout/            # AppLayout, Header, Sidebar, BottomNav
│   ├── public/            # 공개 홈페이지 섹션
│   └── {sales,gallery,expenses,insights,auth}/
├── lib/
│   ├── actions/           # Server Actions
│   ├── supabase/          # client, server, middleware, service-role
│   ├── api/               # Kotlin BFF 클라이언트
│   ├── storage.ts         # Cloudflare R2 추상화
│   ├── validations.ts     # Zod 스키마
│   ├── errors.ts          # AppError, withErrorLogging()
│   └── ...                # auth-guard, logger, export, env, utils
├── types/database.ts      # 타입 정의
└── public/
    ├── sw.js              # Service Worker
    └── icons/             # PWA 아이콘
```

---

## 멀티테넌시

단일 배포로 여러 독립 꽃집을 운영하며, 데이터는 DB 계층에서 격리됩니다.

| 항목 | 내용 |
|------|------|
| 격리 방식 (주 경로) | Kotlin BFF가 JWT 기준으로 테넌트를 격리 (web은 `user_id` 미전송) |
| 격리 방식 (DB/잔존 Supabase) | 19개 테이블에 `user_id` 컬럼 + RLS 정책 `auth.uid() = user_id` |
| unique 제약 | 단일 컬럼 → `(column, user_id)` 복합 (예: `customers(phone, user_id)`) |

---

## 주요 기능

| 영역 | 기능 |
|------|------|
| 매출 | 등록/수정/삭제, 카테고리·결제방식·채널 다중선택 필터, 카드 수수료 자동계산, 사진 첨부(R2), 로드 구입 간편 모드, 미수(외상) 관리 |
| 지출 | 등록/수정/삭제, 단가×수량, 고정비(주/월/연 반복 + Cron 자동 생성, iOS식 이것만/이후 모두 수정) |
| 고객 | 전화번호 기반 식별, 구매 이력 연동, 매출 등록 시 자동완성 |
| 예약 | 캘린더 CRUD, 예약→매출 전환, 리마인더 푸시 |
| 사진첩 | 완성작 카드, 색상 태그, 드래그 정렬, 매출 연동 |
| 인사이트 | 트렌드 아티클·인스타그램 피드, 스크랩/메모 |
| 대시보드 | 당일 매출 요약, 월간 분석, 실시간 집계 |
| PWA & 푸시 | 모바일 설치, 매일 08:00 KST 예약 요약, 예약별 리마인더 |
| 기타 | 라이트/다크 모드, BottomNav 커스텀(4~6개, 드래그 정렬), CSV/Excel/PDF 내보내기 |

---

## CI/CD

```mermaid
flowchart LR
    GH["GitHub Push / PR"] --> CI["GitHub Actions\nlint · type-check · test · build"]
    CI --> Vercel["Vercel\n자동 배포"]
    Vercel --> Cron["Vercel Cron\n예약 리마인더 · 고정비 생성"]

    style CI fill:#1565c0,color:#fff
    style Vercel fill:#2e7d32,color:#fff
```

| 단계 | 설명 |
|------|------|
| 검증 | GitHub Actions — ESLint, 타입 체크, Vitest, 빌드 |
| 배포 | Vercel 자동 배포 (Git 연동) |
| 스케줄 | Vercel Cron — 예약 리마인더, 고정비 자동 생성 |
| 모니터링 | 미지 에러 → Discord 웹훅 (`withErrorLogging`) |
