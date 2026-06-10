# Server Action 컨벤션

매출/지출/고객 등 모든 데이터 변경(CUD)은 `src/lib/actions/` 의 Server Action으로 처리한다.

## 1. 기본 형태

- 파일 최상단 `'use server'`
- 함수는 `withErrorLogging()` 로 감싸 export — 예상된 에러는 `AppError` 로 throw, 미지의 에러는 Discord로 자동 보고
- **직접 import 만 사용** (barrel `index.ts` re-export 금지 — 소비처는 `@/lib/actions/sales` 처럼 직접 import)

```ts
'use server';

import { withErrorLogging } from '@/lib/errors';
import { apiFetch } from '@/lib/api/client';

export const createSale = withErrorLogging(async (input: SaleInput) => {
  await requireAuth();
  const data = saleSchema.parse(input);                    // Zod 검증
  return apiFetch<KotlinSale>('/sales', {                   // BFF 호출 (주 경로)
    method: 'POST',
    body: JSON.stringify({ /* ... */ }),
  });
});
```

## 2. 데이터 접근 — BFF가 주 경로

- **주 경로**: `apiFetch`(`src/lib/api/client.ts`)로 Kotlin BFF REST 호출. JWT 쿠키를 Authorization 헤더로 붙이고, 401이면 refresh로 1회 자동 재발급 후 재시도
- 테넌트 격리·카드수수료(fee/expected_deposit) 등 계산은 **BFF가 JWT 기준으로 수행** → web은 `user_id` 를 보내지 않는다
- web은 DB에 직접 연결하지 않는다 (Supabase 클라이언트 없음)
- **내부 API**: 서버에 사용자용 엔드포인트가 없는 관리 작업(인스타 계정 CRUD)은 `apiFetchInternal`로 BFF `/internal/*`(Bearer `INTERNAL_API_KEY`)를 호출한다

## 3. 에러 처리

| 상황 | 처리 |
|------|------|
| 예상된 비즈니스 에러 (검증 실패, 권한 없음 등) | `throw new AppError(ErrorCode.XXX, '메시지')` |
| 미지의 런타임 에러 | `withErrorLogging()` 가 catch → `reportError()` → Discord 웹훅 |

- `AppError` / `ErrorCode` / `withErrorLogging()` 는 `src/lib/errors.ts`, Discord 전송은 `src/lib/logger.ts`

## 4. 인증 가드

- 모든 Action 진입부에서 `requireAuth()` (`src/lib/auth-guard.ts`) 호출 → BFF `/me` 조회 + 온보딩 게이트

## 5. 검증 (Zod)

- 스키마는 `src/lib/validations.ts` 에 정의
- 모든 CUD 액션 입력 + ID 파라미터 UUID 검증
- 이미지 파일: `validateImageFile(File)` / `validateImageMeta({name,type,size})`, 크기 5MB 제한

## 6. 변경 후 갱신

- 클라이언트는 변경 성공 후 `router.refresh()` 로 서버 데이터 재요청 (글로벌 상태 없음)
