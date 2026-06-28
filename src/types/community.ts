export type CommunityCategory =
  | 'notice'
  | 'daily'
  | 'question'
  | 'knowledge'
  | 'review'
  | 'etc';

export interface CommunityPost {
  id: string;
  author_nickname: string;
  author_is_admin: boolean;
  category: CommunityCategory;
  title: string;
  content: unknown; // Tiptap JSON (JSONContent)
  content_text: string; // 검색/미리보기용 plain text
  image_urls: string[];
  is_pinned: boolean;
  like_count: number;
  liked: boolean; // 현재 사용자 좋아요 여부
  comment_count: number;
  is_mine: boolean; // 현재 사용자 작성 여부 (수정/삭제 노출)
  viewer_is_admin: boolean; // 현재 사용자 운영자 여부 (고정 등 관리자 액션 노출)
  created_at: string;
  updated_at: string;
}

export interface CommunityComment {
  id: string;
  post_id: string;
  parent_id: string | null; // 대댓글 셀프참조
  author_nickname: string;
  author_is_admin: boolean;
  content: string; // 평문
  is_secret: boolean;
  is_mine: boolean;
  can_view: boolean; // 비밀댓글 열람 권한
  is_deleted: boolean; // soft delete → "삭제된 댓글입니다"
  created_at: string;
}

export const COMMUNITY_CATEGORIES = [
  { value: 'notice', label: '공지', color: '#ef4444' },
  { value: 'daily', label: '자유', color: '#8b9d83' },
  { value: 'question', label: '질문', color: '#3b82f6' },
  { value: 'knowledge', label: '노하우', color: '#f59e0b' },
  { value: 'review', label: '후기', color: '#a855f7' },
  { value: 'etc', label: '기타', color: '#64748b' },
] as const;

// 관리자만 작성 가능한 카테고리 (api `CommunityCategories.ADMIN_ONLY` 와 동기화).
// 글쓰기 폼에서 비관리자에게는 이 카테고리 옵션을 숨긴다(서버가 NOTICE_ADMIN_ONLY 로 최종 차단).
export const COMMUNITY_ADMIN_ONLY_CATEGORIES: readonly CommunityCategory[] = ['notice'];

export const COMMUNITY_CATEGORY_LABELS: Record<CommunityCategory, string> = {
  notice: '공지',
  daily: '자유',
  question: '질문',
  knowledge: '노하우',
  review: '후기',
  etc: '기타',
};
