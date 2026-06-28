import {MarketingClient} from './marketing-client';

// 마케팅 — 네이버 블로그 초안 AI(SPEC-AI-007). 데이터는 클라이언트에서 서버액션으로 로드한다
// (초안 목록·말투 프로필이 사용자 상호작용에 따라 변하므로 SSR 프리패치 불필요).
export default function MarketingPage() {
  return <MarketingClient />;
}
