import type { GuideSectionMeta } from './types';

// 가이드 좌측 네비/인덱스 카드의 섹션 그룹. order로 정렬.
export const GUIDE_SECTIONS: GuideSectionMeta[] = [
  { id: 'start', title: '시작하기', order: 1 },
  { id: 'operate', title: '매장 운영', order: 2 },
  { id: 'customer', title: '고객 기록', order: 3 },
  { id: 'marketing', title: '마케팅', order: 4 },
  { id: 'info', title: '정보 · 소통', order: 5 },
  { id: 'settings', title: '설정', order: 6 },
  { id: 'support', title: '고객센터', order: 7 },
];
