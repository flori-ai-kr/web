import {z} from 'zod';

// ─── 서버 환경변수 스키마 ───────────────────────────────────
// 빌드 시 필수 환경변수가 누락되면 빌드를 실패시킨다.
// 새 환경변수 추가 시 이 스키마에도 추가할 것.

const serverEnvSchema = z.object({
  // ─── 필수: Push 알림 (VAPID) ──────────────────────────────
  NEXT_PUBLIC_VAPID_PUBLIC_KEY: z.string().min(1, '빈 값일 수 없습니다'),

  // ─── 필수: 서버 기능 ──────────────────────────────────────
  INTERNAL_API_KEY: z.string().min(32, 'INTERNAL_API_KEY는 32자 이상이어야 합니다'),

  // ─── 필수: 백엔드 API (BFF 서버↔서버) ────────────────────────
  // NEXT_PUBLIC_ 접두사 없음 — 서버 전용. 브라우저에 노출 금지.
  API_URL: z.string().url('유효한 API URL이어야 합니다').default('http://localhost:8080'),

  // ─── 선택: 기능별 ─────────────────────────────────────────
  // 사진 스토리지 공개 URL. 업로드·삭제·presigned 발급은 BFF가 소유하지만,
  // 브라우저가 이미지를 표시(next/image, CSP img-src)하고 presigned PUT(CSP connect-src)을
  // 하려면 호스트명이 필요하다. 자격증명이 아니라 공개 도메인. 미설정 시 해당 호스트 미허용.
  STORAGE_PUBLIC_URL: z.string().url().optional(),
  DISCORD_WEBHOOK_URL: z.string().url().optional(),
  // 소셜 OAuth 키. 모두 서버 전용(NEXT_PUBLIC 금지). 없으면 해당 공급자 로그인 비활성.
  OAUTH_KAKAO_REST_API_KEY: z.string().min(1).optional(),
  OAUTH_GOOGLE_CLIENT_ID: z.string().min(1).optional(),
  OAUTH_NAVER_CLIENT_ID: z.string().min(1).optional(),
  // 사전등록 후 안내할 카카오톡 오픈채팅 링크(공개 URL). 미설정 시 버튼 비활성.
  NEXT_PUBLIC_KAKAO_OPENCHAT_URL: z.string().url().optional(),
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
