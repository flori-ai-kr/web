'use server';

import { sanitizeErrorStack } from './log-format';

// ─── 타입 ────────────────────────────────────────────────────
interface ErrorContext {
  action?: string;
  url?: string;
  userId?: string;
  extra?: Record<string, unknown>;
}

// ─── 중복 방지 (in-memory, 5분 TTL) ─────────────────────────
const recentErrors = new Map<string, number>();
const DEDUP_WINDOW_MS = 5 * 60 * 1000; // 5분

function isDuplicate(key: string): boolean {
  const now = Date.now();
  const lastSent = recentErrors.get(key);
  if (lastSent && now - lastSent < DEDUP_WINDOW_MS) {
    return true;
  }
  recentErrors.set(key, now);

  // 오래된 항목 정리
  if (recentErrors.size > 50) {
    for (const [k, v] of recentErrors) {
      if (now - v > DEDUP_WINDOW_MS) recentErrors.delete(k);
    }
  }
  return false;
}

// ─── 스택 트레이스 새니타이징 ─────────────────────────────────
// sanitizeErrorStack 은 log-format.ts 로 이동(Discord·pino stdout 공유). 여기선 재노출만.

// ─── 문자열 잘라내기 ─────────────────────────────────────────
function truncate(str: string, max: number): string {
  return str.length > max ? str.slice(0, max - 3) + '...' : str;
}

// ─── 메인: 에러 리포팅 ──────────────────────────────────────
export async function reportError(
  error: unknown,
  context: ErrorContext = {},
): Promise<void> {
  const webhookUrl = process.env.DISCORD_WEBHOOK_URL;

  // 안전하게 에러 메시지 추출 (RSC 직렬화 불가 객체 대응)
  const safeMessage = (() => {
    try {
      if (error instanceof Error) return error.message;
      if (typeof error === 'string') return error;
      return JSON.stringify(error);
    } catch {
      return '(직렬화 불가 에러)';
    }
  })();

  // 구조화 stdout 로그 (Discord 알림과 별개 — docker logs/CloudWatch 수집용).
  // nodejs 가드 + 동적 import 로 Edge·클라 안전. 항상 emit(아래 dev early-return 전).
  // [보안] raw err 객체 대신 sanitize 된 message/stack 문자열만 넘긴다(토큰/이메일/경로 마스킹).
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    try {
      const { log } = await import('./log');
      log.error(
        {
          event: 'app_error',
          action: context.action,
          url: context.url,
          errMessage: safeMessage,
          errStack:
            error instanceof Error && error.stack
              ? sanitizeErrorStack(error.stack)
              : undefined,
        },
        `❌ ${context.action || '오류'}`,
      );
    } catch {
      // 구조화 로깅 실패는 무시 — Discord 보고가 주 경로
    }
  }

  // 개발 환경이거나 웹훅 미설정 시 콘솔만
  if (process.env.NODE_ENV === 'development' || !webhookUrl) {
    console.error('[Error]', context.action || '', safeMessage);
    return;
  }

  const err = error instanceof Error ? error : new Error(safeMessage);
  const dedupKey = `${err.message}:${context.action || ''}`;

  if (isDuplicate(dedupKey)) return;

  const timestamp = new Date().toLocaleString('ko-KR', {
    timeZone: 'Asia/Seoul',
  });

  const embed = {
    title: '운영 오류 발생',
    color: 0xe5614e,
    fields: [
      {
        name: '오류 메시지',
        value: truncate(err.message, 256),
        inline: false,
      },
      {
        name: '액션',
        value: context.action || '(알 수 없음)',
        inline: true,
      },
      {
        name: '시간 (KST)',
        value: timestamp,
        inline: true,
      },
      ...(context.url
        ? [{ name: 'URL', value: context.url, inline: false }]
        : []),
      ...(err.stack
        ? [
            {
              name: '스택 트레이스',
              value: `\`\`\`\n${truncate(sanitizeErrorStack(err.stack), 1000)}\n\`\`\``,
              inline: false,
            },
          ]
        : []),
    ],
  };

  try {
    await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ embeds: [embed] }),
    });
  } catch (webhookError) {
    console.error('[Logger] Discord 웹훅 전송 실패:', webhookError);
  }
}
