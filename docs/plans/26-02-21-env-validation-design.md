# 빌드 타임 환경변수 검증 설계

## 배경

Vercel 배포에서 R2 환경변수 5개 누락 → 이미지 깨짐 + 업로드 실패 + 413 에러.
현재는 `!` 단언으로 조용히 실패하여 원인 파악이 어려움.

## 목표

- 필수 환경변수 누락 시 **빌드를 실패**시켜 배포 전에 문제를 잡는다
- 어떤 변수가 빠졌는지 **명확한 에러 메시지**를 출력한다

## 현황

| 환경변수 | 현재 검증 |
|---------|----------|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ next.config.ts에서 throw |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ❌ `!` 단언 |
| `R2_ACCOUNT_ID` | ❌ 없음 |
| `R2_ACCESS_KEY_ID` | ❌ `!` 단언 |
| `R2_SECRET_ACCESS_KEY` | ❌ `!` 단언 |
| `R2_BUCKET_NAME` | ❌ `!` 단언 |
| `R2_PUBLIC_URL` | ❌ optional 처리 |
| `SUPABASE_SERVICE_ROLE_KEY` | 런타임 체크 (cron에서만) |
| `DISCORD_WEBHOOK_URL` | 선택적 (없으면 콘솔) |
| `VAPID_*` 3개 | 런타임 체크 (push에서만) |
| `CRON_SECRET` | 런타임 체크 |

## 설계

### `src/lib/env.ts` — 환경변수 검증 모듈

Zod로 환경변수 스키마 정의. 서버 전용 변수와 공개 변수를 분리.

```ts
import { z } from 'zod';

// 서버 전용 (빌드 시 필수)
const serverSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  R2_ACCOUNT_ID: z.string().min(1),
  R2_ACCESS_KEY_ID: z.string().min(1),
  R2_SECRET_ACCESS_KEY: z.string().min(1),
  R2_BUCKET_NAME: z.string().min(1),
  R2_PUBLIC_URL: z.string().url(),
  // 선택적 (없으면 기능 비활성화)
  DISCORD_WEBHOOK_URL: z.string().url().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional(),
  VAPID_PRIVATE_KEY: z.string().min(1).optional(),
  VAPID_SUBJECT: z.string().optional(),
  CRON_SECRET: z.string().min(1).optional(),
});

export function validateEnv() {
  const result = serverSchema.safeParse(process.env);
  if (!result.success) {
    const missing = result.error.issues
      .map(i => `  - ${i.path.join('.')}: ${i.message}`)
      .join('\n');
    throw new Error(`환경변수 검증 실패:\n${missing}`);
  }
  return result.data;
}
```

### 적용 위치

`next.config.ts`에서 `validateEnv()` 호출 → 빌드 시 자동 실행.

기존 `next.config.ts`의 개별 SUPABASE_URL 검증은 `validateEnv()`로 대체.

### 기존 코드 변경

- `storage.ts`: `!` 단언 유지 (빌드 시 이미 검증됨)
- `supabase/*.ts`: `!` 단언 유지 (빌드 시 이미 검증됨)
- `next.config.ts`: 기존 `if (!process.env.NEXT_PUBLIC_SUPABASE_URL) throw` 제거 → `validateEnv()` 호출로 대체

### 파일 변경 목록

1. **신규**: `src/lib/env.ts` — Zod 스키마 + validateEnv()
2. **수정**: `next.config.ts` — validateEnv() 호출, 기존 개별 검증 제거

### SSR 에러 Discord 전송

이미 구현 완료:
- `src/app/(dashboard)/error.tsx` → `reportError()` 호출
- `src/app/global-error.tsx` → `reportError()` 호출

추가 작업 없음.
