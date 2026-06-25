'use server';

import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/admin-guard';
import { apiFetch } from '@/lib/api/client';
import { AppError, ErrorCode, withErrorLogging } from '@/lib/errors';
import { ALLOWED_PROMPT_MODELS } from '@/types/admin-prompt';
import type {
  PreviewInput,
  PreviewResult,
  PromptCreateInput,
  PromptDetail,
  PromptSummary,
  PromptUpdateInput,
} from '@/types/admin-prompt';

// ─── AI 프롬프트 레지스트리 콘솔 — Spring 게이트웨이(/admin/prompts/*, @RequiresAdmin) 경유 ───
// web은 ai-server를 모른다. 게이트웨이가 active 로드·캐시·preview 중개·DB 영속을 담당한다.

const CONSOLE_PATH = '/console/prompts';

function assertValidId(id: number): void {
  if (!Number.isInteger(id) || id <= 0) {
    throw new AppError(ErrorCode.VALIDATION, '유효하지 않은 ID입니다');
  }
}

/** 모델은 화이트리스트만 허용(비용/오용 방어). null/미지정은 ai-server 기본값 사용 의미. */
function assertAllowedModel(model: string | null | undefined): void {
  if (model && !ALLOWED_PROMPT_MODELS.includes(model as never)) {
    throw new AppError(ErrorCode.VALIDATION, '허용되지 않은 모델입니다');
  }
}

// BFF: GET /admin/prompts?channel=
async function _listPrompts(channel: string = 'blog'): Promise<PromptSummary[]> {
  await requireAdmin();
  return apiFetch<PromptSummary[]>(`/admin/prompts?channel=${encodeURIComponent(channel)}`);
}
export const listPrompts = withErrorLogging('listPrompts', _listPrompts);

// BFF: GET /admin/prompts/{id}
async function _getPrompt(id: number): Promise<PromptDetail> {
  await requireAdmin();
  assertValidId(id);
  return apiFetch<PromptDetail>(`/admin/prompts/${id}`);
}
export const getPrompt = withErrorLogging('getPrompt', _getPrompt);

// BFF: POST /admin/prompts
async function _createPrompt(input: PromptCreateInput): Promise<PromptDetail> {
  await requireAdmin();
  assertAllowedModel(input.model);
  const res = await apiFetch<PromptDetail>('/admin/prompts', {
    method: 'POST',
    body: JSON.stringify(input),
  });
  revalidatePath(CONSOLE_PATH);
  return res;
}
export const createPrompt = withErrorLogging('createPrompt', _createPrompt);

// BFF: PATCH /admin/prompts/{id}
async function _updatePrompt(id: number, input: PromptUpdateInput): Promise<PromptDetail> {
  await requireAdmin();
  assertValidId(id);
  assertAllowedModel(input.model);
  const res = await apiFetch<PromptDetail>(`/admin/prompts/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
  revalidatePath(CONSOLE_PATH);
  return res;
}
export const updatePrompt = withErrorLogging('updatePrompt', _updatePrompt);

// BFF: POST /admin/prompts/{id}/activate (롤백 = 과거 버전 활성화)
async function _activatePrompt(id: number): Promise<PromptDetail> {
  await requireAdmin();
  assertValidId(id);
  const res = await apiFetch<PromptDetail>(`/admin/prompts/${id}/activate`, { method: 'POST' });
  revalidatePath(CONSOLE_PATH);
  return res;
}
export const activatePrompt = withErrorLogging('activatePrompt', _activatePrompt);

// BFF: DELETE /admin/prompts/{id} (soft delete — active 버전은 게이트웨이가 거부)
async function _deletePrompt(id: number): Promise<void> {
  await requireAdmin();
  assertValidId(id);
  await apiFetch(`/admin/prompts/${id}`, { method: 'DELETE' });
  revalidatePath(CONSOLE_PATH);
}
export const deletePrompt = withErrorLogging('deletePrompt', _deletePrompt);

// BFF: POST /admin/prompts/preview — 플레이그라운드(저장 안 함 → revalidate 안 함)
async function _previewPrompt(input: PreviewInput): Promise<PreviewResult> {
  await requireAdmin();
  assertAllowedModel(input.promptDraft.model);
  return apiFetch<PreviewResult>('/admin/prompts/preview', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}
export const previewPrompt = withErrorLogging('previewPrompt', _previewPrompt);
