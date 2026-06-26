'use server';

import {revalidatePath} from 'next/cache';
import {requireAuth} from '@/lib/auth-guard';
import {AppError, ErrorCode, withErrorLogging} from '@/lib/errors';
import {idSchema} from '@/lib/validations';
import {apiFetch} from '@/lib/api/client';
import type {CommunityCategory, CommunityComment, CommunityPost,} from '@/types/database';

// ─── 커뮤니티 Server Actions ────────────────────────────────────
// 단일 커뮤니티(테넌트 간 공유). 권한/마스킹/소유권은 BFF가 뷰어(JWT) 기준으로 계산해 응답에 채운다.

// ─── Kotlin DTO 미러 (camelCase) ────────────────────────────────

interface PostResponseDto {
  id: number;
  authorNickname: string;
  authorIsAdmin: boolean;
  category: CommunityCategory;
  title: string;
  content: unknown; // Tiptap JSON
  contentText: string;
  imageUrls: string[];
  isPinned: boolean;
  likeCount: number;
  commentCount: number;
  liked: boolean;
  isMine: boolean;
  viewerIsAdmin: boolean;
  createdAt: string;
  updatedAt: string;
}

interface PostsPageDto {
  posts: PostResponseDto[];
  hasMore: boolean;
}

interface CommentResponseDto {
  id: number;
  postId: number;
  parentId: number | null;
  authorNickname: string;
  authorIsAdmin: boolean;
  content: string;
  isSecret: boolean;
  isMine: boolean;
  canView: boolean;
  isDeleted: boolean;
  createdAt: string;
}

interface LikeToggleDto {
  liked: boolean;
  likeCount: number;
}

// ─── 매핑 (camelCase DTO → 웹 snake_case 타입, id는 string으로 정규화) ──

function toPost(dto: PostResponseDto): CommunityPost {
  return {
    id: String(dto.id),
    author_nickname: dto.authorNickname,
    author_is_admin: dto.authorIsAdmin,
    category: dto.category,
    title: dto.title,
    content: dto.content,
    content_text: dto.contentText,
    image_urls: dto.imageUrls ?? [],
    is_pinned: dto.isPinned,
    like_count: dto.likeCount,
    liked: dto.liked,
    comment_count: dto.commentCount,
    is_mine: dto.isMine,
    viewer_is_admin: dto.viewerIsAdmin,
    created_at: dto.createdAt,
    updated_at: dto.updatedAt,
  };
}

function toComment(dto: CommentResponseDto): CommunityComment {
  return {
    id: String(dto.id),
    post_id: String(dto.postId),
    parent_id: dto.parentId != null ? String(dto.parentId) : null,
    author_nickname: dto.authorNickname,
    author_is_admin: dto.authorIsAdmin,
    content: dto.content,
    is_secret: dto.isSecret,
    is_mine: dto.isMine,
    can_view: dto.canView,
    is_deleted: dto.isDeleted,
    created_at: dto.createdAt,
  };
}

// ─── 조회 ───────────────────────────────────────────────────────

// 무한스크롤 페이지 크기. 카드 그리드라 매출/지출(100)보다 작게.
const COMMUNITY_PAGE_SIZE = 20;

export interface CommunityFilters {
  category?: CommunityCategory;
  search?: string;
}

export interface CommunityPostsPage {
  posts: CommunityPost[];
  hasMore: boolean;
}

// BFF: GET /community/posts?category&search&offset&limit (offset 페이지네이션 + 서버사이드 검색)
async function _getCommunityPosts(
  filters?: CommunityFilters,
  offset = 0,
  limit = COMMUNITY_PAGE_SIZE,
): Promise<CommunityPostsPage> {
  await requireAuth();

  const params = new URLSearchParams();
  if (filters?.category) params.append('category', filters.category);
  if (filters?.search) params.append('search', filters.search);
  params.set('offset', String(offset));
  params.set('limit', String(limit));

  const page = await apiFetch<PostsPageDto>(`/community/posts?${params.toString()}`);
  return { posts: (page.posts || []).map(toPost), hasMore: page.hasMore };
}

export const getCommunityPosts = withErrorLogging('getCommunityPosts', _getCommunityPosts);

// 무한스크롤 추가 로드(+서버사이드 검색). use-infinite-list의 loadPage에서 호출한다.
async function _loadMoreCommunityPosts(
  category: CommunityCategory | null,
  offset: number,
  search?: string,
): Promise<CommunityPostsPage> {
  return _getCommunityPosts({ category: category ?? undefined, search }, offset, COMMUNITY_PAGE_SIZE);
}

export const loadMoreCommunityPosts = withErrorLogging('loadMoreCommunityPosts', _loadMoreCommunityPosts);

// BFF: GET /community/posts/{id}
async function _getCommunityPost(id: string): Promise<CommunityPost | null> {
  await requireAuth();
  const idParsed = idSchema.safeParse(id);
  if (!idParsed.success) throw new AppError(ErrorCode.VALIDATION, 'ID 형식이 올바르지 않습니다');

  try {
    const dto = await apiFetch<PostResponseDto>(`/community/posts/${id}`);
    return toPost(dto);
  } catch (e) {
    if (e instanceof AppError && e.code === ErrorCode.NOT_FOUND) return null;
    throw e;
  }
}

export const getCommunityPost = withErrorLogging('getCommunityPost', _getCommunityPost);

// BFF: GET /community/posts/{id}/comments
async function _getComments(postId: string): Promise<CommunityComment[]> {
  await requireAuth();
  const idParsed = idSchema.safeParse(postId);
  if (!idParsed.success) throw new AppError(ErrorCode.VALIDATION, 'ID 형식이 올바르지 않습니다');

  const dtos = await apiFetch<CommentResponseDto[]>(`/community/posts/${postId}/comments`);
  return (dtos || []).map(toComment);
}

export const getComments = withErrorLogging('getComments', _getComments);

// 대시보드 "커뮤니티 최신글" 카드용 경량 조회 — 제목·메타데이터만 (B10 소비)
// category 는 코드(CommunityCategory)이므로, 렌더 시 COMMUNITY_CATEGORY_LABELS / CommunityCategoryBadge 로 라벨링한다.
export interface LatestCommunityPost {
  id: string;
  title: string;
  category: CommunityCategory;
  createdAt: string;
}

// BFF: GET /community/posts?limit=N (목록 엔드포인트 재사용). 상위 limit개만 반환.
async function _getLatestCommunityPosts(limit = 8): Promise<LatestCommunityPost[]> {
  await requireAuth();

  const page = await apiFetch<PostsPageDto>(`/community/posts?limit=${limit}`);
  return (page.posts || [])
    .slice(0, limit)
    .map((p) => ({
      id: String(p.id),
      title: p.title,
      category: p.category,
      createdAt: p.createdAt,
    }));
}

export const getLatestCommunityPosts = withErrorLogging(
  'getLatestCommunityPosts',
  _getLatestCommunityPosts,
);

// ─── 변경 ───────────────────────────────────────────────────────

export interface CommunityPostInput {
  category: CommunityCategory;
  title: string;
  content: unknown; // Tiptap JSON
  contentText: string;
  imageUrls?: string[];
}

function postBody(input: CommunityPostInput) {
  return {
    category: input.category,
    title: input.title.trim(),
    contentJson: input.content,
    contentText: input.contentText,
    imageUrls: input.imageUrls ?? [],
  };
}

// BFF: POST /community/posts
async function _createCommunityPost(input: CommunityPostInput): Promise<CommunityPost> {
  await requireAuth();
  if (!input.title?.trim()) throw new AppError(ErrorCode.VALIDATION, '제목을 입력해주세요');
  if (!input.contentText?.trim()) throw new AppError(ErrorCode.VALIDATION, '내용을 입력해주세요');

  const dto = await apiFetch<PostResponseDto>('/community/posts', {
    method: 'POST',
    body: JSON.stringify(postBody(input)),
  });
  revalidatePath('/admin/community');
  return toPost(dto);
}

export const createCommunityPost = withErrorLogging('createCommunityPost', _createCommunityPost);

// BFF: PATCH /community/posts/{id}
async function _updateCommunityPost(id: string, input: CommunityPostInput): Promise<CommunityPost> {
  await requireAuth();
  const idParsed = idSchema.safeParse(id);
  if (!idParsed.success) throw new AppError(ErrorCode.VALIDATION, 'ID 형식이 올바르지 않습니다');
  if (!input.title?.trim()) throw new AppError(ErrorCode.VALIDATION, '제목을 입력해주세요');
  if (!input.contentText?.trim()) throw new AppError(ErrorCode.VALIDATION, '내용을 입력해주세요');

  const dto = await apiFetch<PostResponseDto>(`/community/posts/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(postBody(input)),
  });
  revalidatePath('/admin/community');
  revalidatePath(`/admin/community/${id}`);
  return toPost(dto);
}

export const updateCommunityPost = withErrorLogging('updateCommunityPost', _updateCommunityPost);

// BFF: DELETE /community/posts/{id}
async function _deleteCommunityPost(id: string): Promise<void> {
  await requireAuth();
  const idParsed = idSchema.safeParse(id);
  if (!idParsed.success) throw new AppError(ErrorCode.VALIDATION, 'ID 형식이 올바르지 않습니다');

  await apiFetch<void>(`/community/posts/${id}`, { method: 'DELETE' });
  revalidatePath('/admin/community');
}

export const deleteCommunityPost = withErrorLogging('deleteCommunityPost', _deleteCommunityPost);

// BFF: POST /community/posts/{id}/like — 서버가 뷰어 기준으로 토글하고 새 상태를 반환한다.
async function _togglePostLike(id: string): Promise<{ liked: boolean; likeCount: number }> {
  await requireAuth();
  const idParsed = idSchema.safeParse(id);
  if (!idParsed.success) throw new AppError(ErrorCode.VALIDATION, 'ID 형식이 올바르지 않습니다');

  const dto = await apiFetch<LikeToggleDto>(`/community/posts/${id}/like`, { method: 'POST' });
  return { liked: dto.liked, likeCount: dto.likeCount };
}

export const togglePostLike = withErrorLogging('togglePostLike', _togglePostLike);

// BFF: POST /community/posts/{id}/pin — 관리자만(서버 강제). 게시글 고정/해제.
async function _setCommunityPostPinned(id: string, pinned: boolean): Promise<CommunityPost> {
  await requireAuth();
  const idParsed = idSchema.safeParse(id);
  if (!idParsed.success) throw new AppError(ErrorCode.VALIDATION, 'ID 형식이 올바르지 않습니다');

  const dto = await apiFetch<PostResponseDto>(`/community/posts/${id}/pin`, {
    method: 'POST',
    body: JSON.stringify({ pinned }),
  });
  revalidatePath('/admin/community');
  revalidatePath(`/admin/community/${id}`);
  return toPost(dto);
}

export const setCommunityPostPinned = withErrorLogging('setCommunityPostPinned', _setCommunityPostPinned);

export interface CommentInput {
  content: string;
  parentId?: string | null;
  isSecret: boolean;
}

// BFF: POST /community/posts/{id}/comments
async function _createComment(postId: string, input: CommentInput): Promise<CommunityComment> {
  await requireAuth();
  const idParsed = idSchema.safeParse(postId);
  if (!idParsed.success) throw new AppError(ErrorCode.VALIDATION, 'ID 형식이 올바르지 않습니다');
  if (!input.content?.trim()) throw new AppError(ErrorCode.VALIDATION, '댓글 내용을 입력해주세요');

  const dto = await apiFetch<CommentResponseDto>(`/community/posts/${postId}/comments`, {
    method: 'POST',
    body: JSON.stringify({
      content: input.content.trim(),
      parentId: input.parentId ? Number(input.parentId) : null,
      isSecret: input.isSecret,
    }),
  });
  revalidatePath(`/admin/community/${postId}`);
  return toComment(dto);
}

export const createComment = withErrorLogging('createComment', _createComment);

// BFF: DELETE /community/comments/{id}
async function _deleteComment(id: string): Promise<void> {
  await requireAuth();
  const idParsed = idSchema.safeParse(id);
  if (!idParsed.success) throw new AppError(ErrorCode.VALIDATION, 'ID 형식이 올바르지 않습니다');

  await apiFetch<void>(`/community/comments/${id}`, { method: 'DELETE' });
}

export const deleteComment = withErrorLogging('deleteComment', _deleteComment);

// ─── 이미지 업로드 ──────────────────────────────────────────────

interface CommunityUploadTargetDto {
  uploadUrl: string;
  fileUrl: string;
  originalName: string;
}

// BFF: POST /community/upload-targets
async function _createCommunityUploadTargets(
  files: { name: string; type: string; size: number }[],
): Promise<CommunityUploadTargetDto[]> {
  await requireAuth();
  return apiFetch<CommunityUploadTargetDto[]>('/community/upload-targets', {
    method: 'POST',
    body: JSON.stringify({ files }),
  });
}

export const createCommunityUploadTargets = withErrorLogging(
  'createCommunityUploadTargets',
  _createCommunityUploadTargets,
);
