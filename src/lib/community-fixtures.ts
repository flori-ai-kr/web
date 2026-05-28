import type {CommunityCategory} from '@/types/database';

// ─── 커뮤니티 목업 데이터 ───────────────────────────────────────
// 서버(BFF) 미구현 단계의 화면 미리보기용 시드 데이터.
// 서버 구현 시 actions/community.ts 가 이 fixture 대신 apiFetch 로 교체된다.
// 작성자 식별은 닉네임 기준(데모). 마스킹/소유권은 actions에서 현재 사용자와 비교해 계산한다.

export interface RawCommunityPost {
  id: string;
  author_nickname: string;
  category: CommunityCategory;
  title: string;
  content: unknown; // Tiptap JSON
  content_text: string;
  image_urls: string[];
  is_secret: boolean;
  is_pinned: boolean;
  liked_by: string[]; // 좋아요한 닉네임
  created_at: string;
  updated_at: string;
}

export interface RawCommunityComment {
  id: string;
  post_id: string;
  parent_id: string | null;
  author_nickname: string;
  content: string;
  is_secret: boolean;
  is_deleted: boolean;
  created_at: string;
}

/** 짧은 Tiptap 문서를 만든다(문단 배열). */
function doc(...paragraphs: string[]): unknown {
  return {
    type: 'doc',
    content: paragraphs.map((text) => ({
      type: 'paragraph',
      content: text ? [{ type: 'text', text }] : [],
    })),
  };
}

export const COMMUNITY_POSTS: RawCommunityPost[] = [
  {
    id: 'p1',
    author_nickname: '플로리관리자',
    category: 'notice',
    title: '플로리 커뮤니티 이용 안내',
    content: doc(
      '플로리 커뮤니티에 오신 것을 환영합니다 🌷',
      '사장님들과 노하우·후기·질문을 자유롭게 나눠주세요. 광고/비방 글은 예고 없이 삭제될 수 있습니다.',
    ),
    content_text: '플로리 커뮤니티에 오신 것을 환영합니다. 사장님들과 노하우·후기·질문을 자유롭게 나눠주세요.',
    image_urls: [],
    is_secret: false,
    is_pinned: true,
    liked_by: ['민지플라워', '봄날의꽃'],
    created_at: '2026-05-20T09:00:00+09:00',
    updated_at: '2026-05-20T09:00:00+09:00',
  },
  {
    id: 'p2',
    author_nickname: '민지플라워',
    category: 'knowledge',
    title: '장마철 절화 수명 늘리는 팁 공유해요',
    content: doc(
      '장마철엔 습도 때문에 꽃이 금방 무르더라고요.',
      '저는 입고 직후 줄기를 사선으로 자르고, 미온수에 컨디셔너를 섞어 컨디셔닝합니다. 냉장 보관 온도는 4~6도가 적당했어요.',
      '다들 어떤 방법 쓰시나요?',
    ),
    content_text: '장마철 절화 수명 늘리는 팁. 사선 절단 + 컨디셔너 + 4~6도 냉장.',
    image_urls: [],
    is_secret: false,
    is_pinned: false,
    liked_by: ['봄날의꽃', '하늘정원', '플로리관리자'],
    created_at: '2026-05-26T14:20:00+09:00',
    updated_at: '2026-05-26T14:20:00+09:00',
  },
  {
    id: 'p3',
    author_nickname: '봄날의꽃',
    category: 'review',
    title: '이번 어버이날 카네이션 도매처 후기',
    content: doc(
      '올해 어버이날 카네이션을 새 도매처에서 받아봤는데 발색이 정말 좋았어요.',
      '단가는 살짝 높지만 컴플레인이 거의 없어서 만족합니다.',
    ),
    content_text: '어버이날 카네이션 도매처 후기. 발색 좋고 컴플레인 적음.',
    image_urls: [],
    is_secret: false,
    is_pinned: false,
    liked_by: ['민지플라워'],
    created_at: '2026-05-25T11:05:00+09:00',
    updated_at: '2026-05-25T11:05:00+09:00',
  },
  {
    id: 'p4',
    author_nickname: '하늘정원',
    category: 'question',
    title: '비밀글) 권리금 관련 상담 받고 싶어요',
    content: doc(
      '매장 양도를 고민 중인데 권리금 책정이 막막합니다.',
      '경험 있으신 분께 조심스레 여쭤봅니다. 비밀글로 올려요.',
    ),
    content_text: '권리금 책정 관련 상담 요청 (비밀글).',
    image_urls: [],
    is_secret: true,
    is_pinned: false,
    liked_by: [],
    created_at: '2026-05-27T16:40:00+09:00',
    updated_at: '2026-05-27T16:40:00+09:00',
  },
  {
    id: 'p5',
    author_nickname: '민지플라워',
    category: 'daily',
    title: '오늘 만든 졸업식 부케 자랑합니다',
    content: doc('파스텔 톤으로 작업한 졸업 부케예요. 고객님이 너무 좋아해주셔서 뿌듯한 하루 🌸'),
    content_text: '졸업식 부케 자랑. 파스텔 톤 작업.',
    image_urls: [],
    is_secret: false,
    is_pinned: false,
    liked_by: ['봄날의꽃', '하늘정원'],
    created_at: '2026-05-28T10:15:00+09:00',
    updated_at: '2026-05-28T10:15:00+09:00',
  },
  {
    id: 'p6',
    author_nickname: '하늘정원',
    category: 'etc',
    title: '꽃 배달용 보냉백 어디서 구매하세요?',
    content: doc('여름철 배달용 보냉백 추천 부탁드려요. 사이즈랑 가성비 괜찮은 곳 찾고 있습니다.'),
    content_text: '여름 배달용 보냉백 추천 요청.',
    image_urls: [],
    is_secret: false,
    is_pinned: false,
    liked_by: [],
    created_at: '2026-05-24T08:50:00+09:00',
    updated_at: '2026-05-24T08:50:00+09:00',
  },
];

export const COMMUNITY_COMMENTS: RawCommunityComment[] = [
  // p2 댓글 (대댓글 포함)
  {
    id: 'c1',
    post_id: 'p2',
    parent_id: null,
    author_nickname: '봄날의꽃',
    content: '저도 컨디셔너 꼭 써요! 확실히 차이 나더라고요.',
    is_secret: false,
    is_deleted: false,
    created_at: '2026-05-26T15:00:00+09:00',
  },
  {
    id: 'c2',
    post_id: 'p2',
    parent_id: 'c1',
    author_nickname: '민지플라워',
    content: '맞아요 ㅎㅎ 온도 관리도 같이 하면 더 오래가요.',
    is_secret: false,
    is_deleted: false,
    created_at: '2026-05-26T15:10:00+09:00',
  },
  {
    id: 'c3',
    post_id: 'p2',
    parent_id: null,
    author_nickname: '하늘정원',
    content: '삭제된 댓글 예시',
    is_secret: false,
    is_deleted: true,
    created_at: '2026-05-26T16:00:00+09:00',
  },
  // p4 (비밀글) 비밀 댓글
  {
    id: 'c4',
    post_id: 'p4',
    parent_id: null,
    author_nickname: '봄날의꽃',
    content: '쪽지 드렸어요. 권리금은 위치/매출 기준으로 잡으시면 됩니다.',
    is_secret: true,
    is_deleted: false,
    created_at: '2026-05-27T17:20:00+09:00',
  },
  // p5 일반 댓글
  {
    id: 'c5',
    post_id: 'p5',
    parent_id: null,
    author_nickname: '하늘정원',
    content: '색 조합 너무 예뻐요 👏',
    is_secret: false,
    is_deleted: false,
    created_at: '2026-05-28T10:40:00+09:00',
  },
];
