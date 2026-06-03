'use server';

import { z } from 'zod';
import { requireAuth } from '@/lib/auth-guard';
import { apiFetch } from '@/lib/api/client';
import { AppError, ErrorCode, withErrorLogging } from '@/lib/errors';
import type {
  AiChatResponse,
  AiConfirmationCard,
  AiConfirmResponse,
  AiSuggestion,
} from '@/types/ai';

// ─── 프리미엄 AI 기능 — Spring 게이트웨이(/ai/*) 경유 ──────────────────
// web은 ai-server를 모른다 — Spring `/ai/*`만 호출한다(apiFetch = JWT 쿠키 패스스루).
// 게이트웨이가 ai-server 중개 + DB 로깅 + 사용량 캡 + human-in-loop 쓰기를 담당한다.

const safeTokenSchema = z
  .string()
  .min(1)
  .max(64)
  .regex(/^[A-Za-z0-9_-]+$/, '잘못된 식별자입니다');

const chatSchema = z.object({
  message: z.string().trim().min(1, '메시지를 입력해 주세요').max(4000, '메시지가 너무 깁니다'),
  sessionToken: safeTokenSchema.optional(),
});

/** POST /ai/chat — 데이터 분석 채팅(A). 반환된 sessionToken으로 멀티턴 유지. */
async function _sendChatMessage(input: { message: string; sessionToken?: string }): Promise<AiChatResponse> {
  await requireAuth();
  const parsed = chatSchema.safeParse(input);
  if (!parsed.success) {
    throw new AppError(ErrorCode.VALIDATION, parsed.error.issues[0]?.message ?? '입력이 올바르지 않습니다');
  }
  return apiFetch<AiChatResponse>('/ai/chat', {
    method: 'POST',
    body: JSON.stringify({ message: parsed.data.message, sessionToken: parsed.data.sessionToken }),
  });
}
export const sendChatMessage = withErrorLogging('sendChatMessage', _sendChatMessage);

/**
 * GET /ai/proactive — 선제 제안(D). best-effort(fail-open):
 * 게이트웨이/AI 장애 시 빈 배열을 반환해 대시보드가 깨지지 않게 한다.
 */
async function _getProactiveSuggestions(): Promise<AiSuggestion[]> {
  await requireAuth();
  try {
    const { suggestions } = await apiFetch<{ suggestions: AiSuggestion[] }>('/ai/proactive');
    return Array.isArray(suggestions) ? suggestions : [];
  } catch {
    return [];
  }
}
export const getProactiveSuggestions = withErrorLogging('getProactiveSuggestions', _getProactiveSuggestions);

/**
 * POST /ai/ocr/reservation — 이미지(공개 URL)에서 예약 초안 추출 → 확인 카드(B, human-in-loop).
 * 게이트웨이가 추출 결과를 제안으로 보관한다. 여기서는 아무것도 생성되지 않는다.
 */
async function _proposeReservationFromImage(imageUrl: string): Promise<AiConfirmationCard> {
  await requireAuth();
  const parsed = z.string().url('유효한 이미지 URL이 아닙니다').max(2000).safeParse(imageUrl);
  if (!parsed.success) {
    throw new AppError(ErrorCode.VALIDATION, parsed.error.issues[0]?.message ?? '이미지 URL이 올바르지 않습니다');
  }
  return apiFetch<AiConfirmationCard>('/ai/ocr/reservation', {
    method: 'POST',
    body: JSON.stringify({ imageUrl: parsed.data }),
  });
}
export const proposeReservationFromImage = withErrorLogging(
  'proposeReservationFromImage',
  _proposeReservationFromImage,
);

/** POST /ai/confirm — 확인 카드 실행. 게이트웨이가 직접 예약을 생성한다(쓰기 종착점). */
async function _confirmAiProposal(proposalId: string): Promise<AiConfirmResponse> {
  await requireAuth();
  const parsed = safeTokenSchema.safeParse(proposalId);
  if (!parsed.success) {
    throw new AppError(ErrorCode.VALIDATION, '잘못된 제안 식별자입니다');
  }
  return apiFetch<AiConfirmResponse>('/ai/confirm', {
    method: 'POST',
    body: JSON.stringify({ proposalId: parsed.data }),
  });
}
export const confirmAiProposal = withErrorLogging('confirmAiProposal', _confirmAiProposal);
