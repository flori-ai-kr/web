# Hazel Admin 전체 리팩터링 설계

> 작성일: 2026-02-12

## 목표

코드베이스의 기술 부채를 청산하고 유지보수성을 높인다.
기능 변경 없이(동작 보존) 구조만 개선한다.

## Phase 1: 정리 (미사용 코드 + 의존성 제거)

### 1-1. 미사용 패키지 제거
- `zustand` 제거 (글로벌 상태 미사용)
- `radix-ui` 제거 (개별 `@radix-ui/*` 패키지만 사용)

### 1-2. 미사용 파일/코드 제거
- `src/lib/fonts/nanumgothic-normal.ts` (미참조 폰트 파일, 2.7MB)
- `public/*.svg` (file.svg, vercel.svg, next.svg, globe.svg, window.svg)
- `src/types/database.ts`의 하드코딩 `PRODUCT_CATEGORIES`, `PAYMENT_METHODS` (DB 동적 조회로 대체됨)
- `src/lib/actions/dashboard.ts`의 미사용 함수 (`getTodayReservations`, `getMonthExpenseTotal`)

### 1-3. console.log 정리
- 17개 파일의 console.log/warn/error → 에러는 `reportError()`, 디버그는 제거

### 1-4. barrel export 정리
- `src/lib/actions/index.ts`에 누락된 함수 추가

## Phase 2: 코드 중복 제거 + 품질 개선

### 2-1. 유틸리티 함수 추출
- `getMonthDateRange(month: string)` → `lib/utils.ts` (4곳 중복)
- 라벨 상수 통합 → `lib/constants.ts` (PAYMENT_LABELS, CHANNEL_LABELS, EXPENSE_LABELS)

### 2-2. 에러 처리 통일
- `reservations.ts`의 객체 반환 패턴 → throw + withErrorLogging 패턴으로 통일

### 2-3. 누락된 Zod 검증 추가
- `photo-tags.ts` updatePhotoTag
- `settings.ts` updateCardCompanySetting

### 2-4. 하드코딩 색상 제거
- `sale-settings.ts`, `expense-settings.ts`의 hex 색상 → CSS 변수 참조

## Phase 3: 컴포넌트 분리

### 3-1. sales-client.tsx 분리 (1170줄 → 4개)
```
src/app/(dashboard)/sales/
├── sales-client.tsx        # 메인 컨테이너 (상태 관리)
├── components/
│   ├── SalesFilters.tsx    # 필터 컨트롤 (년/월/카테고리/결제방식)
│   ├── SalesTable.tsx      # 테이블 표시 + 정렬
│   ├── SalesForm.tsx       # 생성/수정 모달 폼
│   └── SalesSummary.tsx    # 요약 카드 (총 매출/건수)
```

### 3-2. customers-client.tsx 분리 (911줄 → 4개)
```
src/app/(dashboard)/customers/
├── customers-client.tsx    # 메인 컨테이너
├── components/
│   ├── CustomerFilters.tsx # 검색 + 등급 필터
│   ├── CustomerCard.tsx    # 개별 고객 카드
│   ├── CustomerForm.tsx    # 생성/수정 모달 폼
│   └── CustomerDetail.tsx  # 상세 정보 + 매출 내역
```

## Phase 4: 타입 안전성 + 아키텍처

### 4-1. TypeScript 설정 강화
- `tsconfig.json` target: ES2017 → ES2022
- `noUncheckedIndexedAccess: true` 추가

### 4-2. `any` 타입 제거
- `src/lib/export.ts`의 `ExportConfig<T = any>` → `unknown` 또는 제네릭 제약

### 4-3. 타입 단언 감소
- 빈도 높은 패턴 (`data as Type[]`) → Supabase 제네릭 활용 또는 타입 가드 추가
- 한번에 모두 교체하지 않고, 새 패턴을 도입 후 점진적 적용

## 미포함 (YAGNI)

- Supabase CLI 생성 타입 도입: 빌드 파이프라인 변경 필요, 별도 작업으로
- i18n 시스템: 단일 언어(한국어)에 과도한 추상화
- 설정 CRUD 팩토리: 현재 2개 파일이라 추상화 비용 > 이득
- 컴포넌트 디렉터리 재구조화: 기존 구조가 충분히 명확

## 검증 방법

- 각 Phase 완료 후 `npm run lint && npx tsc --noEmit && npm test && npm run build` 실행
- 기존 테스트 통과 확인
- 리팩터링 후 security-auditor, code-reviewer 서브에이전트로 검토
