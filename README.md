# Hazel Admin

꽃집(헤이즐) 매출/지출/고객/예약을 통합 관리하는 PWA 어드민 웹 애플리케이션

---

## 프로젝트 소개

Hazel Admin은 소규모 꽃집 운영에 필요한 매출, 지출, 고객, 예약, 사진첩, 입금 대조, 통계를 하나의 웹 앱에서 관리할 수 있도록 설계된 어드민 시스템이다. PWA(Progressive Web App) 기반으로 모바일 브라우저에서 앱처럼 설치하여 사용할 수 있으며, 푸시 알림을 통해 예약 리마인더를 받을 수 있다.

---

## 배경 및 동기

소규모 꽃집을 운영하면서 매출과 지출을 엑셀이나 수기로 기록하는 방식은 몇 가지 한계가 있다.

- **기록의 누락과 부정확함**: 바쁜 영업 중 수기 기록은 빠지기 쉽고, 사후 정리에 시간이 걸린다.
- **고객 데이터의 부재**: 단골 고객의 구매 이력이나 선호를 체계적으로 관리하기 어렵다.
- **예약 관리의 비효율**: 전화나 메모로 관리하는 예약은 누락 위험이 크다.
- **경영 분석의 어려움**: 월별 매출 추이, 카테고리별 비중, 결제 방식별 현황을 파악하려면 별도 작업이 필요하다.
- **이동 중 접근 불가**: PC에 설치된 프로그램은 매장 밖에서 접근할 수 없다.

이러한 문제를 해결하기 위해, 모바일에서도 쉽게 접근할 수 있는 PWA 형태의 관리 시스템을 만들었다. 실시간 매출 현황 파악, 고객 관리 자동화, 예약 리마인더 푸시 알림 등을 통해 꽃집 운영의 효율을 높이는 것이 목표이다.

---

## 주요 기능

### 매출 관리

- 매출 등록, 수정, 삭제
- 상품 카테고리, 결제 방식, 판매 채널별 분류
- 카드 결제 시 카드사 선택 및 수수료 자동 계산
- 사진 첨부 (3MB 초과 시 자동 압축, 최대 10장)
- 로드 구입(도매) 간편 등록 모드
- 일자별 그룹핑 카드형 목록

### 지출 관리

- 지출 등록, 수정, 삭제
- 카테고리 및 결제 방식 설정
- 단가 x 수량 자동 계산

### 고객 관리

- 고객 등록, 수정, 삭제
- 전화번호 기반 고객 식별 (자동 포맷팅)
- 등급 시스템 (신규, 단골, VIP, 블랙리스트)
- 매출 내역 연동 및 구매 이력 조회
- 매출 등록 시 고객 자동 검색 및 연결

### 예약 캘린더

- 예약 등록, 수정, 삭제
- 예약을 매출로 자동 전환
- 제작 완료 상태 토글
- 리마인더 시간 설정 및 푸시 알림 발송

### 사진첩

- 포토카드 형태의 작업물 사진 관리
- 태그 시스템 (색상 지정 가능)
- 드래그 앤 드롭으로 사진 순서 정렬
- 매출 내역과 연동

### 입금 대조

- 카드사별 입금 예정일 확인
- 입금 완료 일괄 처리 및 취소
- 수수료 차감 후 예상 입금액 자동 계산

### 통계 및 대시보드

- 오늘 매출 요약 및 월별 분석 대시보드
- 카테고리별, 결제 방식별, 판매 채널별, 고객별 매출 통계
- 지출 분석
- 실시간 집계 (DB 하드코딩 없음)

### 다크 모드

- 시스템 설정 연동 및 수동 전환
- CSS 변수 기반 테마 시스템

### PWA 및 푸시 알림

- 모바일 브라우저에서 홈 화면에 설치
- Service Worker 기반 푸시 알림 수신
- 매일 08:00 KST 예약 요약 알림
- 개별 예약 리마인더 알림

### 내보내기

- CSV, Excel, PDF 형식의 데이터 내보내기 지원

---

## 기술 스택

| 분류 | 기술 |
|------|------|
| Framework | Next.js 16 (App Router), React 19, TypeScript |
| Styling | Tailwind CSS v4, shadcn/ui (Radix UI 기반) |
| Database | Supabase (PostgreSQL, Auth, RLS) |
| Storage | Cloudflare R2 (S3 호환, CDN) |
| Validation | Zod 4 |
| Charts | Recharts |
| Date | date-fns |
| Toast | Sonner |
| Theme | next-themes |
| Icons | lucide-react |
| Push | Web Push API (VAPID), Service Worker |
| Image | browser-image-compression (클라이언트 사이드) |
| Export | ExcelJS, jsPDF |
| Test | Vitest, fast-check (속성 기반 테스트), Testing Library |
| Deploy | Vercel |
| CI/CD | GitHub Actions (Lint, Type Check, Test, Build) |
| Error Logging | Discord Webhook |

---

## 기대 효과

- **매출/지출 기록의 디지털화**: 수기 기록 대신 체계적인 데이터 관리로 정확한 경영 분석이 가능하다. 월별 추이, 카테고리별 비중, 결제 방식별 현황을 즉시 파악할 수 있다.
- **고객 데이터 축적**: 고객별 구매 이력과 등급을 관리하여 단골 고객에게 맞춤 서비스를 제공할 수 있다.
- **예약 누락 방지**: 예약 등록 시 리마인더를 설정하면 푸시 알림으로 미리 알려주어, 예약을 잊거나 놓치는 일을 줄인다.
- **멀티 유저 지원**: Supabase Auth 기반 인증으로 직원별 독립된 계정 관리가 가능하며, RLS(Row Level Security)로 데이터 접근을 제어한다.
- **모바일 최적화**: PWA로 별도 앱 설치 없이 모바일 브라우저에서 앱처럼 사용할 수 있다. 반응형 레이아웃으로 다양한 화면 크기를 지원한다.
- **운영 비용 절감**: Supabase 무료 플랜과 Cloudflare R2의 무료 대역폭을 활용하여 소규모 꽃집에 적합한 비용 구조를 유지한다.

---

## 프로젝트 구조

```
src/
├── app/
│   ├── (dashboard)/            # 대시보드 라우트 그룹 (사이드바 레이아웃)
│   │   ├── page.tsx            # 대시보드
│   │   ├── sales/              # 매출 관리
│   │   ├── expenses/           # 지출 관리
│   │   ├── customers/          # 고객 관리
│   │   ├── deposits/           # 입금 대조
│   │   ├── gallery/            # 사진첩
│   │   ├── calendar/           # 예약 캘린더
│   │   ├── statistics/         # 통계
│   │   └── settings/           # 설정
│   ├── api/cron/               # Vercel Cron 라우트 (푸시 알림)
│   ├── login/                  # 로그인
│   └── manifest.ts             # PWA 매니페스트
├── components/
│   ├── layout/                 # AppLayout, Header, Sidebar
│   ├── sales/                  # 매출 공통 컴포넌트
│   ├── gallery/                # 갤러리 컴포넌트
│   ├── expenses/               # 지출 컴포넌트
│   └── ui/                     # shadcn/ui 컴포넌트
├── lib/
│   ├── actions/                # Server Actions (15개)
│   ├── supabase/               # Supabase 클라이언트 (client, server, middleware)
│   ├── errors.ts               # AppError, withErrorLogging()
│   ├── logger.ts               # Discord 웹훅 에러 로깅
│   ├── validations.ts          # Zod 스키마
│   ├── auth-guard.ts           # requireAuth() 인증 가드
│   ├── storage.ts              # Cloudflare R2 스토리지 추상화
│   ├── constants.ts            # 공유 라벨 상수
│   ├── export.ts               # CSV/Excel/PDF 내보내기
│   └── utils.ts                # 유틸리티 함수
├── types/
│   └── database.ts             # TypeScript 타입 정의
└── public/
    ├── sw.js                   # Service Worker (푸시 알림)
    └── icons/                  # PWA 아이콘
```

---

## 시작하기

### 사전 요구 사항

- Node.js 22 이상
- npm
- [Supabase](https://supabase.com) 프로젝트
- [Cloudflare R2](https://www.cloudflare.com/developer-platform/r2/) 버킷

### 1. 의존성 설치

```bash
npm install
```

### 2. 환경 변수 설정

프로젝트 루트에 `.env.local` 파일을 생성하고 아래 변수를 설정한다.

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key

# Cloudflare R2
R2_ACCOUNT_ID=your-cloudflare-account-id
R2_ACCESS_KEY_ID=your-r2-access-key
R2_SECRET_ACCESS_KEY=your-r2-secret-key
R2_BUCKET_NAME=your-r2-bucket-name
R2_PUBLIC_URL=your-r2-public-url

# Web Push (VAPID)
NEXT_PUBLIC_VAPID_PUBLIC_KEY=your-vapid-public-key
VAPID_PRIVATE_KEY=your-vapid-private-key

# Cron 인증
CRON_SECRET=your-cron-secret

# 에러 로깅
DISCORD_WEBHOOK_URL=your-discord-webhook-url
```

### 3. 데이터베이스 설정

Supabase SQL Editor에서 `supabase/schema.sql`을 실행하여 테이블과 RLS 정책을 생성한다.

### 4. 개발 서버 실행

```bash
npm run dev
```

`http://localhost:3100`에서 확인할 수 있다.

### 기타 명령어

```bash
npm run build        # 프로덕션 빌드
npm run lint         # ESLint 실행
npm test             # 테스트 실행
npm run test:watch   # 테스트 Watch 모드
```
