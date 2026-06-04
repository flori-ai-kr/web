import type { CSSProperties } from 'react';

// 오프라인 폴백 페이지. 서비스워커가 네비게이션 네트워크 실패 시 캐시에서 서빙한다.
// 오프라인 상태에서는 JS 번들이 로드되지 않을 수 있으므로:
//  - 'use client' 없이 정적 렌더 (JS 없이도 마크업이 보임)
//  - CSS 번들도 없을 수 있어 인라인 <style>로 자급자족 (prefers-color-scheme 다크 대응)
//  - 재시도는 onClick(JS) 대신 <a href="/">로 처리 → JS 없이도 동작
export const dynamic = 'force-static';

const STYLES = `
.flori-offline { min-height: 100dvh; display: flex; flex-direction: column;
  align-items: center; justify-content: center; padding: 2rem; text-align: center;
  font-family: Pretendard, -apple-system, BlinkMacSystemFont, system-ui, sans-serif;
  background-color: #FBF8F3; color: #241F22; }
.flori-offline__badge { width: 56px; height: 56px; border-radius: 50%;
  display: flex; align-items: center; justify-content: center; margin-bottom: 18px;
  font-size: 26px; background-color: #FBEFF3; color: #A85475; }
.flori-offline__desc { font-size: 14px; color: rgba(36,31,34,0.6); margin: 6px 0 20px; max-width: 320px; line-height: 1.5; }
.flori-offline__btn { display: inline-block; padding: 10px 20px; border-radius: 10px;
  text-decoration: none; font-size: 14px; font-weight: 600; background-color: #A85475; color: #fff; }
@media (prefers-color-scheme: dark) {
  .flori-offline { background-color: #1C1819; color: #EDE8E6; }
  .flori-offline__badge { background-color: #3A2430; color: #DB8FA9; }
  .flori-offline__desc { color: #a89c98; }
  .flori-offline__btn { background-color: #DB8FA9; color: #1C1819; }
}
`;

const titleStyle: CSSProperties = { fontSize: 17, fontWeight: 600, margin: 0 };

export default function OfflinePage() {
  return (
    <div className="flori-offline">
      <style dangerouslySetInnerHTML={{ __html: STYLES }} />
      <div className="flori-offline__badge">🌷</div>
      <h1 style={titleStyle}>오프라인 상태예요</h1>
      <p className="flori-offline__desc">
        인터넷 연결이 끊겼습니다. 네트워크를 확인한 뒤 다시 시도해 주세요.
      </p>
      {/* 오프라인 폴백은 JS 없이 동작해야 하므로 next/link 대신 의도적으로 plain <a>를 쓴다
          (Link는 클라이언트 네비게이션이라 JS 필요). 클릭 시 일반 네비게이션 → 복구 시 정상 로드. */}
      {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
      <a className="flori-offline__btn" href="/">
        다시 시도
      </a>
    </div>
  );
}
