import type { GuideSectionMeta } from './types';

// 가이드 좌측 네비/인덱스 카드의 섹션 그룹. order로 정렬.
export const GUIDE_SECTIONS: GuideSectionMeta[] = [
  { id: 'start', title: '시작하기', order: 1 },
  { id: 'operate', title: '매장 운영', order: 2 },
  { id: 'grow', title: '성장 · 인사이트', order: 3 },
  { id: 'community', title: '커뮤니티 · 지원', order: 4 },
  { id: 'settings', title: '설정', order: 5 },
];
