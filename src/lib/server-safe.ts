import 'server-only';

/** Next 내부 제어 에러(redirect/notFound)인지 — 이건 삼키지 말고 전파해야 한다(인증 리다이렉트·404 보존). */
export function isNextControlError(e: unknown): boolean {
  return (
    !!e &&
    typeof e === 'object' &&
    'digest' in e &&
    typeof (e as { digest: unknown }).digest === 'string' &&
    (e as { digest: string }).digest.startsWith('NEXT_')
  );
}

/**
 * fn 을 실행하고 실패하면 fallback 을 반환한다. 단, Next 제어 에러(redirect/notFound)는
 * 흡수하지 않고 전파한다 — 서버 컴포넌트에서 BFF 미구현/일시오류로 페이지가 깨지지 않게 하면서도
 * 인증 리다이렉트·notFound 의미는 보존하기 위함. (대시보드·인사이트·커뮤니티 등 병렬 조회에서 공용 사용)
 */
export async function safe<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await fn();
  } catch (e) {
    if (isNextControlError(e)) throw e;
    return fallback;
  }
}
