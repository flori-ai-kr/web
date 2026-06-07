'use client';

import { useEffect, useRef } from 'react';
import { reportError } from '@/lib/logger';

// global-error는 루트 <html>을 직접 렌더하므로 globals.css의 CSS 변수에 접근할 수 없다.
// 색은 인라인으로 두되, prefers-color-scheme 미디어쿼리(<style>)로 다크모드를 지원한다.
// 액센트는 현행 브랜드 Rose(라이트 #A85475 / 다크 #DB8FA9). 미디어쿼리는 인라인 style로
// 표현할 수 없어 클래스 + <style> 블록을 사용한다.
const STYLES = `
.flori-global-error {
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  min-height: 100vh; padding: 2rem; text-align: center;
  background-color: #fafafa; color: #171717;
}
.flori-global-error__badge {
  width: 48px; height: 48px; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  margin-bottom: 16px; font-size: 20px; font-weight: 700;
  background-color: #fdeef2; color: #A85475;
}
.flori-global-error__desc { font-size: 14px; color: #6b7280; margin-bottom: 16px; max-width: 320px; }
.flori-global-error__btn {
  padding: 8px 16px; border-radius: 8px; border: none; cursor: pointer;
  font-size: 14px; font-weight: 500; background-color: #A85475; color: #fff;
}
@media (prefers-color-scheme: dark) {
  .flori-global-error { background-color: #101317; color: #E7EBF0; }
  .flori-global-error__badge { background-color: #3a2630; color: #DB8FA9; }
  .flori-global-error__desc { color: #8B95A2; }
  .flori-global-error__btn { background-color: #DB8FA9; color: #101317; }
}
`;

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const reported = useRef(false);

  useEffect(() => {
    if (reported.current) return;
    reported.current = true;
    reportError(error, { action: 'global-error-boundary' });
  }, [error]);

  return (
    <html lang="ko">
      <body
        style={{
          margin: 0,
          fontFamily:
            'Pretendard, -apple-system, BlinkMacSystemFont, system-ui, sans-serif',
        }}
      >
        <style dangerouslySetInnerHTML={{ __html: STYLES }} />
        <div className="flori-global-error">
          <div className="flori-global-error__badge">!</div>
          <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>
            시스템 오류가 발생했습니다
          </h2>
          <p className="flori-global-error__desc">
            페이지를 새로고침하거나 잠시 후 다시 시도해 주세요.
          </p>
          <button onClick={reset} className="flori-global-error__btn">
            다시 시도
          </button>
        </div>
      </body>
    </html>
  );
}
