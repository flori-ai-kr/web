// flori 마케팅 AI 게이트웨이(Spring `/ai/marketing/*`) REST 계약 타입.
// web은 Spring 게이트웨이만 호출한다 — ai-server(FastAPI)는 내부망 전용이라 web이 모른다.
// 게이트웨이가 tone_profile 로드·store_context 조립·캡·영속을 담당하고, web은 초안만 렌더·복사한다.

/** 블로그 본문 섹션 한 단락(소제목 + 본문). */
export interface BlogSection {
  heading: string;
  body: string;
}

/** 하단 FAQ 한 항목(질문/답변). */
export interface BlogFaq {
  q: string;
  a: string;
}

/**
 * 생성된 네이버 블로그 초안. 네이버에 복붙해 쓰는 용도(자동 업로드 없음).
 * 섹션 ≥3 · FAQ 3~5 · 해시태그 ≥3 (게이트웨이/ai-server가 보장).
 */
export interface BlogDraft {
  title: string;
  sections: BlogSection[];
  faq: BlogFaq[];
  hashtags: string[];
}

/** POST /ai/marketing/blog — 초안 생성 결과(contentId로 목록/상세 연결). */
export interface GenerateBlogResponse {
  contentId: string;
  draft: BlogDraft;
}

/** generateBlogDraft 입력(web → 게이트웨이). photoUrls는 0~4장(갤러리/업로드 공개 URL). */
export interface GenerateBlogInput {
  keyword: string;
  situation?: string;
  memo?: string;
  photoUrls?: string[];
}

/** GET/PUT /ai/marketing/tone-profile — 사장 블로그 글 샘플(말투 few-shot). */
export interface ToneProfile {
  samples: string[];
}

/**
 * GET /ai/marketing/contents 목록 항목. 본문(draft)은 상세에서만 채워진다(목록은 메타만).
 * 목록 카드 표기용으로 title/keyword 요약을 함께 받는다.
 */
export interface BlogContentSummary {
  id: string;
  channel: string;
  title: string;
  keyword: string;
  createdAt: string; // ISO 8601 (UTC)
}

/** GET /ai/marketing/contents/{id} 상세 — 입력 요약 + 생성된 초안 전문. */
export interface BlogContentDetail extends BlogContentSummary {
  situation: string | null;
  memo: string | null;
  photoUrls: string[];
  draft: BlogDraft;
}

/** GET /ai/marketing/contents 응답(페이지네이션). */
export interface BlogContentsPage {
  contents: BlogContentSummary[];
  hasMore: boolean;
}
