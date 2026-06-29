'use server';

import { z } from 'zod';
import { requireAuth } from '@/lib/auth-guard';
import { apiFetch } from '@/lib/api/client';
import { AppError, ErrorCode, withErrorLogging } from '@/lib/errors';
import type {
  BlogContentDetail,
  BlogContentsPage,
  BlogDraft,
  GenerateBlogInput,
  GenerateBlogResponse,
  ToneProfile,
} from '@/types/marketing';

// ─── 마케팅 AI(B로그 초안) — Spring 게이트웨이(/ai/marketing/*) 경유 ───────────
// web은 ai-server를 모른다 — Spring `/ai/marketing/*`만 호출한다(apiFetch = JWT 쿠키 패스스루).
// 게이트웨이가 ai-server 중개 + tone_profile 로드 + store_context 조립 + 사용량 캡 + DB 영속을 담당한다.

// SPEC-AI-007 계약 상한과 일치(ai-server에서 재검증). 사용자 텍스트는 게이트웨이/ai-server에서 펜스 격리된다.
const generateSchema = z.object({
  keyword: z.string().trim().min(1, '타깃 키워드를 입력해 주세요').max(200, '키워드가 너무 깁니다'),
  situation: z.string().trim().max(100, '상황 설명이 너무 깁니다').optional(),
  memo: z.string().trim().max(500, '메모가 너무 깁니다').optional(),
  photoUrls: z
    .array(z.string().url('유효한 이미지 URL이 아닙니다').max(2000))
    .max(4, '사진은 최대 4장까지 첨부할 수 있어요')
    .optional(),
});

const toneProfileSchema = z.object({
  samples: z
    .array(z.string().trim().min(1).max(4000, '샘플 글이 너무 깁니다'))
    .max(3, '말투 샘플은 최대 3개까지 등록할 수 있어요'),
});

// 초안 수정 — api MarketingContentUpdateRequest 상한과 일치(서버에서 재검증). output(draft)만 보낸다.
const updateContentSchema = z.object({
  title: z.string().trim().min(1, '제목을 입력해 주세요').max(300, '제목이 너무 깁니다'),
  sections: z
    .array(
      z.object({
        heading: z.string().trim().min(1, '소제목을 입력해 주세요').max(300, '소제목이 너무 깁니다'),
        body: z.string().trim().min(1, '본문을 입력해 주세요').max(10000, '본문이 너무 깁니다'),
      }),
    )
    .min(1, '본문 단락을 한 개 이상 입력해 주세요')
    .max(30, '본문 단락이 너무 많아요'),
  faq: z
    .array(
      z.object({
        q: z.string().trim().min(1, '질문을 입력해 주세요').max(1000, '질문이 너무 깁니다'),
        a: z.string().trim().min(1, '답변을 입력해 주세요').max(4000, '답변이 너무 깁니다'),
      }),
    )
    .max(30, 'FAQ는 최대 30개까지 등록할 수 있어요')
    .default([]),
  hashtags: z
    .array(z.string().trim().max(100, '해시태그가 너무 깁니다'))
    .max(30, '해시태그는 최대 30개까지 등록할 수 있어요')
    .default([]),
});

// 게이트웨이 contentId는 영숫자/하이픈 식별자(UUID/숫자 허용). ai.ts의 safeToken과 동일 패턴.
const contentIdSchema = z
  .string()
  .min(1)
  .max(64)
  .regex(/^[A-Za-z0-9_-]+$/, '잘못된 식별자입니다');

const listSchema = z.object({
  offset: z.number().int().min(0).max(10_000).optional(),
  limit: z.number().int().min(1).max(50).optional(),
});

/**
 * POST /ai/marketing/blog — 사진+키워드로 네이버 블로그 초안 생성.
 * 게이트웨이가 tone_profile·store_context를 조립해 ai-server를 호출하고 결과를 영속한다.
 * 자동 업로드 없음 — 반환된 draft를 사용자가 복붙해 게시한다.
 */
async function _generateBlogDraft(input: GenerateBlogInput): Promise<GenerateBlogResponse> {
  await requireAuth();
  const parsed = generateSchema.safeParse(input);
  if (!parsed.success) {
    throw new AppError(ErrorCode.VALIDATION, parsed.error.issues[0]?.message ?? '입력이 올바르지 않습니다');
  }
  return apiFetch<GenerateBlogResponse>('/ai/marketing/blog', {
    method: 'POST',
    body: JSON.stringify({
      keyword: parsed.data.keyword,
      situation: parsed.data.situation,
      memo: parsed.data.memo,
      photoUrls: parsed.data.photoUrls,
    }),
  });
}
export const generateBlogDraft = withErrorLogging('generateBlogDraft', _generateBlogDraft);

/** GET /ai/marketing/tone-profile — 저장된 말투 샘플 조회(없으면 빈 배열). */
async function _getToneProfile(): Promise<ToneProfile> {
  await requireAuth();
  const res = await apiFetch<{ samples: string[] | null }>('/ai/marketing/tone-profile');
  return { samples: Array.isArray(res.samples) ? res.samples : [] };
}
export const getToneProfile = withErrorLogging('getToneProfile', _getToneProfile);

/** PUT /ai/marketing/tone-profile — 말투 샘플 upsert(최대 3개). 다음 생성부터 자동 적용. */
async function _saveToneProfile(input: ToneProfile): Promise<ToneProfile> {
  await requireAuth();
  const parsed = toneProfileSchema.safeParse(input);
  if (!parsed.success) {
    throw new AppError(ErrorCode.VALIDATION, parsed.error.issues[0]?.message ?? '입력이 올바르지 않습니다');
  }
  await apiFetch<void>('/ai/marketing/tone-profile', {
    method: 'PUT',
    body: JSON.stringify({ samples: parsed.data.samples }),
  });
  return { samples: parsed.data.samples };
}
export const saveToneProfile = withErrorLogging('saveToneProfile', _saveToneProfile);

/** GET /ai/marketing/contents — 과거 생성한 블로그 초안 목록(소프트삭제 제외). */
async function _listBlogContents(input: { offset?: number; limit?: number } = {}): Promise<BlogContentsPage> {
  await requireAuth();
  const parsed = listSchema.safeParse(input);
  if (!parsed.success) {
    throw new AppError(ErrorCode.VALIDATION, '잘못된 목록 요청입니다');
  }
  const params = new URLSearchParams({ channel: 'blog' });
  if (parsed.data.offset != null) params.set('offset', String(parsed.data.offset));
  if (parsed.data.limit != null) params.set('limit', String(parsed.data.limit));
  const res = await apiFetch<{ contents: BlogContentsPage['contents'] | null; hasMore?: boolean }>(
    `/ai/marketing/contents?${params.toString()}`,
  );
  return {
    contents: Array.isArray(res.contents) ? res.contents : [],
    hasMore: Boolean(res.hasMore),
  };
}
export const listBlogContents = withErrorLogging('listBlogContents', _listBlogContents);

/** GET /ai/marketing/contents/{id} — 초안 상세(입력 요약 + 초안 전문). */
async function _getBlogContent(id: string): Promise<BlogContentDetail> {
  await requireAuth();
  const parsed = contentIdSchema.safeParse(id);
  if (!parsed.success) {
    throw new AppError(ErrorCode.VALIDATION, '잘못된 식별자입니다');
  }
  return apiFetch<BlogContentDetail>(`/ai/marketing/contents/${parsed.data}`);
}
export const getBlogContent = withErrorLogging('getBlogContent', _getBlogContent);

/**
 * PUT /ai/marketing/contents/{id} — 초안 수정 저장. output(제목·단락·FAQ·해시태그)만 갱신하고
 * 입력 메타(키워드/상황/메모/사진)·생성시각은 서버가 보존한다. 갱신된 상세를 반환한다.
 */
async function _updateBlogContent(id: string, input: BlogDraft): Promise<BlogContentDetail> {
  await requireAuth();
  const parsedId = contentIdSchema.safeParse(id);
  if (!parsedId.success) {
    throw new AppError(ErrorCode.VALIDATION, '잘못된 식별자입니다');
  }
  const parsed = updateContentSchema.safeParse(input);
  if (!parsed.success) {
    throw new AppError(ErrorCode.VALIDATION, parsed.error.issues[0]?.message ?? '입력이 올바르지 않습니다');
  }
  return apiFetch<BlogContentDetail>(`/ai/marketing/contents/${parsedId.data}`, {
    method: 'PUT',
    body: JSON.stringify({
      title: parsed.data.title,
      sections: parsed.data.sections,
      faq: parsed.data.faq,
      hashtags: parsed.data.hashtags,
    }),
  });
}
export const updateBlogContent = withErrorLogging('updateBlogContent', _updateBlogContent);

/** DELETE /ai/marketing/contents/{id} — 초안 소프트삭제. */
async function _deleteBlogContent(id: string): Promise<void> {
  await requireAuth();
  const parsed = contentIdSchema.safeParse(id);
  if (!parsed.success) {
    throw new AppError(ErrorCode.VALIDATION, '잘못된 식별자입니다');
  }
  await apiFetch<void>(`/ai/marketing/contents/${parsed.data}`, { method: 'DELETE' });
}
export const deleteBlogContent = withErrorLogging('deleteBlogContent', _deleteBlogContent);
