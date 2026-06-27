import type { Instrumentation } from 'next';
import { SERVICE_NAME, sanitizeErrorStack, kstIso } from './lib/log-format';

// Next.js 16 표준 계측 훅. 서버 프로세스 1회 부팅 + 서버/렌더 에러 중앙 포착.
// pino 는 nodejs 런타임 코드라 NEXT_RUNTIME 가드 + 동적 import 로만 사용한다
// (미들웨어 = Edge 런타임 번들엔 pino 가 포함되면 안 됨).

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { log } = await import('./lib/log');
    log.info(
      {
        event: 'boot',
        env: process.env.NODE_ENV,
        appVersion: process.env.APP_VERSION ?? 'unknown',
      },
      '🚀 web 시작',
    );
  }
}

// 모든 서버사이드 에러(RSC·route handler·SSR)를 구조화 로그로 남긴다.
// 클라이언트 에러바운더리(Discord 보고)와는 별개의 stdout 경로.
export const onRequestError: Instrumentation.onRequestError = async (
  error,
  request,
  context,
) => {
  // [이중 로깅 방지] withErrorLogging 은 unexpected 에러를 reportError(원본 스택 기록)로
  // 처리한 뒤 AppError 로 감싸 re-throw 하고, 예상된 도메인 에러도 AppError 로 던진다.
  // 둘 다 여기서 ERROR 로 다시 찍으면 저정보 중복 로그가 된다 → AppError 는 스킵.
  if (error instanceof Error && error.name === 'AppError') {
    return;
  }

  const payload = {
    event: 'request_error',
    method: request.method,
    path: request.path.split('?')[0], // [보안] 쿼리스트링(OAuth code/state 등) 제거
    routePath: context.routePath,
    routeType: context.routeType,
  };

  if (process.env.NEXT_RUNTIME === 'nodejs') {
    try {
      const { log } = await import('./lib/log');
      log.error(
        {
          ...payload,
          // [보안] raw err 대신 sanitize 된 message/stack 만 기록(토큰/이메일/경로 마스킹).
          errMessage: error instanceof Error ? error.message : String(error),
          errStack:
            error instanceof Error && error.stack
              ? sanitizeErrorStack(error.stack)
              : undefined,
        },
        '❌ 서버 에러',
      );
    } catch {
      // 구조화 로깅 실패는 무시 — 에러 핸들러 자체가 throw 하지 않게 보호
    }
  } else {
    // Edge 런타임(미들웨어 등): pino 불가 → 최소 구조화 stdout 폴백(logstash 키 정합).
    console.error(
      JSON.stringify({
        '@timestamp': kstIso(new Date()),
        level: 'ERROR',
        message: '❌ 서버 에러 (edge)',
        service: SERVICE_NAME,
        ...payload,
        errMessage: (error instanceof Error ? error.message : String(error)).slice(0, 200),
      }),
    );
  }
};
