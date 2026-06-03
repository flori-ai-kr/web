// flori AI 게이트웨이(Spring `/ai/*`) REST 계약 타입.
// web은 Spring 게이트웨이만 호출한다 — ai-server(FastAPI)는 내부망 전용이라 web이 모른다.

/** POST /ai/chat — 데이터 분석 채팅(A). sessionToken은 서버 발급, 멀티턴에 재사용. */
export interface AiChatResponse {
  reply: string;
  sessionToken: string;
}

/** GET /ai/proactive — 선제 제안(D). 표시 전용, 실행은 confirm 경유. */
export interface AiSuggestion {
  title: string;
  detail: string;
}

/** 확인 카드 한 줄(label: 값). OCR 초안의 사람이 읽는 표현. */
export interface AiConfirmationField {
  label: string;
  value: string;
}

/**
 * POST /ai/ocr/reservation — 이미지에서 추출한 예약 초안의 확인 카드(B, human-in-loop).
 * proposalId로 확인(POST /ai/confirm)해야 게이트웨이가 실제 예약을 생성한다.
 */
export interface AiConfirmationCard {
  proposalId: string;
  action: string; // 예: "create_reservation"
  summary: string;
  fields: AiConfirmationField[];
  expiresAt: string; // ISO 8601 (UTC)
}

/** POST /ai/confirm — 확인 카드 실행 결과(게이트웨이가 예약 생성). */
export interface AiConfirmResponse {
  action: string;
  reservationId: number | null;
}
