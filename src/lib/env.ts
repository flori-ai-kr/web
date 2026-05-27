import {z} from 'zod';

// ─── 서버 환경변수 스키마 ───────────────────────────────────
// 빌드 시 필수 환경변수가 누락되면 빌드를 실패시킨다.
// 새 환경변수 추가 시 이 스키마에도 추가할 것.

const serverEnvSchema = z.object({
  // ─── 필수: Supabase ───────────────────────────────────────
  NEXT_PUBLIC_SUPABASE_URL: z.string().url('유효한 Supabase URL이어야 합니다'),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1, '빈 값일 수 없습니다'),

  // ─── 필수: Cloudflare R2 ──────────────────────────────────
  R2_ACCOUNT_ID: z.string().min(1, '빈 값일 수 없습니다'),
  R2_ACCESS_KEY_ID: z.string().min(1, '빈 값일 수 없습니다'),
  R2_SECRET_ACCESS_KEY: z.string().min(1, '빈 값일 수 없습니다'),
  R2_BUCKET_NAME: z.string().min(1, '빈 값일 수 없습니다'),
  R2_PUBLIC_URL: z.string().url('유효한 R2 퍼블릭 URL이어야 합니다'),

  // ─── 필수: Push 알림 (VAPID) ──────────────────────────────
  NEXT_PUBLIC_VAPID_PUBLIC_KEY: z.string().min(1, '빈 값일 수 없습니다'),

  // ─── 필수: 서버 기능 ──────────────────────────────────────
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1, 'Service Role 키 필수'),
  INTERNAL_API_KEY: z.string().min(32, 'INTERNAL_API_KEY는 32자 이상이어야 합니다'),

  // ─── 필수: Kotlin 백엔드 API (BFF 서버↔서버) ────────────────
  // NEXT_PUBLIC_ 접두사 없음 — 서버 전용. 브라우저에 노출 금지.
  KOTLIN_API_URL: z.string().url('유효한 Kotlin API URL이어야 합니다').default('http://localhost:8080'),

  // ─── 선택: 기능별 ─────────────────────────────────────────
  VAPID_PRIVATE_KEY: z.string().min(1).optional(),
  VAPID_SUBJECT: z.string().optional(),
  DISCORD_WEBHOOK_URL: z.string().url().optional(),
  CRON_SECRET: z.string().min(1).optional(),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

/**
 * 빌드 타임에 환경변수를 검증한다.
 * next.config.ts에서 호출하여 배포 전에 누락을 잡는다.
 */
export function validateEnv(): ServerEnv {
  const result = serverEnvSchema.safeParse(process.env);

  if (!result.success) {
    const issues = result.error.issues.map(
      (i) => `  ${i.path.join('.')}: ${i.message}`
    );
    console.error('\n========================================');
    console.error('  환경변수 검증 실패');
    console.error('========================================');
    issues.forEach((line) => console.error(line));
    console.error('========================================\n');
    throw new Error(
      `필수 환경변수가 누락되었습니다:\n${issues.join('\n')}`
    );
  }

  return result.data;
}
