import type { Instrumentation } from 'next';

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
  const payload = {
    event: 'request_error',
    method: request.method,
    path: request.path,
    routePath: context.routePath,
    routeType: context.routeType,
  };

  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { log } = await import('./lib/log');
    log.error({ ...payload, err: error }, '❌ 서버 에러');
  } else {
    // Edge 런타임(미들웨어 등): pino 불가 → 최소 구조화 stdout 폴백.
    console.error(
      JSON.stringify({
        level: 'ERROR',
        message: '❌ 서버 에러 (edge)',
        service: 'flori-ai-web',
        ...payload,
        errMessage: error instanceof Error ? error.message : String(error),
      }),
    );
  }
};
