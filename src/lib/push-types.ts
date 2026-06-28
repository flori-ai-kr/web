// 푸시 타입 라벨·설명 SSOT (백엔드 PushTypes 와 1:1). 점주 수신설정·콘솔 테스트가 공유.

export const PUSH_TYPE_META: Record<string, { label: string; desc: string }> = {
  community_notice: { label: '공지', desc: '운영 공지 (항상 발송)' },
  reservation_reminder: { label: '예약 리마인더', desc: '픽업 예약 임박 알림' },
  daily_pickup_summary: { label: '일일 픽업 요약', desc: '매일 아침 당일 예약 요약' },
  broadcast: { label: '마케팅·소식', desc: 'flori 캠페인·이벤트 안내' },
  community_comment: { label: '댓글·답글', desc: '내 글/댓글에 달린 댓글' },
  auction_scrap_update: { label: '경매 스크랩 시세', desc: '스크랩한 품목 시세 업데이트' },
  grant_new: { label: '지원사업 신규', desc: '새로운 지원사업 추가' },
  grant_deadline: { label: '지원사업 마감', desc: '스크랩한 지원사업 마감 임박' },
  storage_resolved: { label: '저장 용량 증설', desc: '증설 요청 승인·거절 결과 (항상 발송)' },
};

export function pushTypeLabel(type: string): string {
  return PUSH_TYPE_META[type]?.label ?? type;
}
