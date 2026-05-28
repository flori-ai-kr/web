'use server';

import {requireAuth} from '@/lib/auth-guard';
import {AppError, ErrorCode, withErrorLogging} from '@/lib/errors';
import type {CommunityCategory, CommunityComment, CommunityPost,} from '@/types/database';
import {
    COMMUNITY_COMMENTS,
    COMMUNITY_POSTS,
    type RawCommunityComment,
    type RawCommunityPost,
} from '@/lib/community-fixtures';

// ─── 커뮤니티 Server Actions ────────────────────────────────────
// ⚠️ 서버(BFF) 미구현: 현재는 community-fixtures 기반 목업.
//   읽기 = fixture + 현재 사용자(닉네임) 기준 비밀/소유 마스킹 계산.
//   쓰기 = stub(영속화 없음, 성공 형태만 반환) → 클라이언트가 낙관적 state로 데모.
//   서버 구현 후 각 함수 주석의 BFF 엔드포인트로 apiFetch 교체 예정.

// ─── 매핑 (raw → 뷰 타입, 뷰어 기준 마스킹) ──────────────────────

function activeCommentCount(postId: string): number {
  return COMMUNITY_COMMENTS.filter((c) => c.post_id === postId && !c.is_deleted).length;
}

function toPost(raw: RawCommunityPost, me: string): CommunityPost {
  const is_mine = raw.author_nickname === me;
  const can_view = !raw.is_secret || is_mine;
  return {
    id: raw.id,
    author_nickname: raw.author_nickname,
    category: raw.category,
    title: raw.title,
    content: can_view ? raw.content : null,
    content_text: can_view ? raw.content_text : '비밀글입니다.',
    image_urls: can_view ? raw.image_urls : [],
    is_secret: raw.is_secret,
    is_pinned: raw.is_pinned,
    like_count: raw.liked_by.length,
    liked: raw.liked_by.includes(me),
    comment_count: activeCommentCount(raw.id),
    is_mine,
    can_view,
    created_at: raw.created_at,
    updated_at: raw.updated_at,
  };
}

function toComment(
  raw: RawCommunityComment,
  me: string,
  postAuthor: string,
): CommunityComment {
  const is_mine = raw.author_nickname === me;
  const parentAuthor = raw.parent_id
    ? COMMUNITY_COMMENTS.find((c) => c.id === raw.parent_id)?.author_nickname ?? null
    : null;
  // 비밀댓글 열람: 작성자 + 글쓴이 + (대댓글이면) 부모댓글 작성자
  const can_view = !raw.is_secret || is_mine || postAuthor === me || parentAuthor === me;
  return {
    id: raw.id,
    post_id: raw.post_id,
    parent_id: raw.parent_id,
    author_nickname: raw.author_nickname,
    content: raw.is_deleted ? '' : can_view ? raw.content : '',
    is_secret: raw.is_secret,
    is_mine,
    can_view,
    is_deleted: raw.is_deleted,
    created_at: raw.created_at,
  };
}

// ─── 조회 ───────────────────────────────────────────────────────

export interface CommunityFilters {
  category?: CommunityCategory;
  search?: string;
}

// BFF: GET /community/posts?category&search&offset&limit
async function _getCommunityPosts(filters?: CommunityFilters): Promise<CommunityPost[]> {
  const user = await requireAuth();
  const me = user.name;

  // 먼저 뷰어 기준으로 마스킹(toPost) → 비밀글 본문이 검색에 노출되지 않게 한다.
  let posts = COMMUNITY_POSTS.map((r) => toPost(r, me));
  if (filters?.category) posts = posts.filter((p) => p.category === filters.category);
  if (filters?.search) {
    const q = filters.search.toLowerCase();
    posts = posts.filter(
      (p) => p.title.toLowerCase().includes(q) || p.content_text.toLowerCase().includes(q),
    );
  }
  // 고정글 우선, 그 다음 최신순
  posts.sort((a, b) => {
    if (a.is_pinned !== b.is_pinned) return a.is_pinned ? -1 : 1;
    return b.created_at.localeCompare(a.created_at);
  });
  return posts;
}

export const getCommunityPosts = withErrorLogging('getCommunityPosts', _getCommunityPosts);

// BFF: GET /community/posts/{id}
async function _getCommunityPost(id: string): Promise<CommunityPost | null> {
  const user = await requireAuth();
  const raw = COMMUNITY_POSTS.find((p) => p.id === id);
  if (!raw) return null;
  return toPost(raw, user.name);
}

export const getCommunityPost = withErrorLogging('getCommunityPost', _getCommunityPost);

// BFF: GET /community/posts/{id}/comments
async function _getComments(postId: string): Promise<CommunityComment[]> {
  const user = await requireAuth();
  const post = COMMUNITY_POSTS.find((p) => p.id === postId);
  const postAuthor = post?.author_nickname ?? '';
  return COMMUNITY_COMMENTS.filter((c) => c.post_id === postId)
    .sort((a, b) => a.created_at.localeCompare(b.created_at))
    .map((c) => toComment(c, user.name, postAuthor));
}

export const getComments = withErrorLogging('getComments', _getComments);

// ─── 변경 (stub) ────────────────────────────────────────────────

export interface CommunityPostInput {
  category: CommunityCategory;
  title: string;
  content: unknown; // Tiptap JSON
  contentText: string;
  isSecret: boolean;
  imageUrls?: string[];
}

// BFF: POST /community/posts
async function _createCommunityPost(input: CommunityPostInput): Promise<CommunityPost> {
  const user = await requireAuth();
  if (!input.title?.trim()) throw new AppError(ErrorCode.VALIDATION, '제목을 입력해주세요');
  if (!input.contentText?.trim()) throw new AppError(ErrorCode.VALIDATION, '내용을 입력해주세요');

  const now = new Date().toISOString();
  // STUB: 영속화 없음. 서버 구현 시 apiFetch<CommunityPost>('/community/posts', { method:'POST', ... })
  return {
    id: crypto.randomUUID(),
    author_nickname: user.name,
    category: input.category,
    title: input.title.trim(),
    content: input.content,
    content_text: input.contentText,
    image_urls: input.imageUrls ?? [],
    is_secret: input.isSecret,
    is_pinned: false,
    like_count: 0,
    liked: false,
    comment_count: 0,
    is_mine: true,
    can_view: true,
    created_at: now,
    updated_at: now,
  };
}

export const createCommunityPost = withErrorLogging('createCommunityPost', _createCommunityPost);

// BFF: PATCH /community/posts/{id}
async function _updateCommunityPost(id: string, input: CommunityPostInput): Promise<CommunityPost> {
  const user = await requireAuth();
  // 소유권 가드 (방어적 — 서버 BFF도 JWT 기준으로 재검증)
  const existing = COMMUNITY_POSTS.find((p) => p.id === id);
  if (existing && existing.author_nickname !== user.name) {
    throw new AppError(ErrorCode.UNAUTHORIZED, '수정 권한이 없습니다');
  }
  if (!input.title?.trim()) throw new AppError(ErrorCode.VALIDATION, '제목을 입력해주세요');
  if (!input.contentText?.trim()) throw new AppError(ErrorCode.VALIDATION, '내용을 입력해주세요');
  const now = new Date().toISOString();
  // STUB
  return {
    id,
    author_nickname: user.name,
    category: input.category,
    title: input.title.trim(),
    content: input.content,
    content_text: input.contentText,
    image_urls: input.imageUrls ?? [],
    is_secret: input.isSecret,
    is_pinned: false,
    like_count: 0,
    liked: false,
    comment_count: 0,
    is_mine: true,
    can_view: true,
    created_at: now,
    updated_at: now,
  };
}

export const updateCommunityPost = withErrorLogging('updateCommunityPost', _updateCommunityPost);

// BFF: DELETE /community/posts/{id}
async function _deleteCommunityPost(id: string): Promise<{ success: boolean }> {
  const user = await requireAuth();
  const existing = COMMUNITY_POSTS.find((p) => p.id === id);
  if (existing && existing.author_nickname !== user.name) {
    throw new AppError(ErrorCode.UNAUTHORIZED, '삭제 권한이 없습니다');
  }
  return { success: true }; // STUB
}

export const deleteCommunityPost = withErrorLogging('deleteCommunityPost', _deleteCommunityPost);

// BFF: POST /community/posts/{id}/like
async function _togglePostLike(
  id: string,
  liked: boolean,
): Promise<{ liked: boolean; likeCount: number }> {
  await requireAuth();
  // STUB: 클라이언트가 보낸 현재 상태를 반전해 돌려준다(낙관적 업데이트와 일치).
  const raw = COMMUNITY_POSTS.find((p) => p.id === id);
  const base = raw ? raw.liked_by.length : 0;
  return { liked: !liked, likeCount: base + (!liked ? 1 : 0) };
}

export const togglePostLike = withErrorLogging('togglePostLike', _togglePostLike);

export interface CommentInput {
  content: string;
  parentId?: string | null;
  isSecret: boolean;
}

// BFF: POST /community/posts/{id}/comments
async function _createComment(postId: string, input: CommentInput): Promise<CommunityComment> {
  const user = await requireAuth();
  if (!input.content?.trim()) throw new AppError(ErrorCode.VALIDATION, '댓글 내용을 입력해주세요');
  // STUB
  return {
    id: crypto.randomUUID(),
    post_id: postId,
    parent_id: input.parentId ?? null,
    author_nickname: user.name,
    content: input.content.trim(),
    is_secret: input.isSecret,
    is_mine: true,
    can_view: true,
    is_deleted: false,
    created_at: new Date().toISOString(),
  };
}

export const createComment = withErrorLogging('createComment', _createComment);

// BFF: DELETE /community/comments/{id}
async function _deleteComment(id: string): Promise<{ success: boolean }> {
  const user = await requireAuth();
  const existing = COMMUNITY_COMMENTS.find((c) => c.id === id);
  if (existing && existing.author_nickname !== user.name) {
    throw new AppError(ErrorCode.UNAUTHORIZED, '삭제 권한이 없습니다');
  }
  return { success: true }; // STUB
}

export const deleteComment = withErrorLogging('deleteComment', _deleteComment);
