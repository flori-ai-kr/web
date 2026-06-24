// flori AI 프롬프트 레지스트리(SPEC-AI-008) — 슈퍼어드민 콘솔 REST 계약 타입.
// web은 Spring 게이트웨이(/admin/prompts/*, @RequiresAdmin)만 호출한다. ai-server는 내부망 전용.
// DB엔 정적 부분(시스템·GEO규칙·출력스펙·모델·temp)만 저장. 동적 데이터는 게이트웨이가 코드 주입.

import type { BlogDraft } from '@/types/marketing';

/** 콘솔에서 편집 가능한 채널. v1은 blog만(CHECK 제약). */
export type PromptChannel = 'blog';

/** 콘솔/플레이그라운드에서 허용하는 모델(LiteLLM 등록 모델 화이트리스트와 일치). */
export const ALLOWED_PROMPT_MODELS = ['claude-haiku-4-5', 'claude-sonnet-4-6'] as const;
export type PromptModel = (typeof ALLOWED_PROMPT_MODELS)[number];

/** 목록 항목(본문 제외 — 채널별 버전 리스트). */
export interface PromptSummary {
  id: number;
  channel: PromptChannel;
  version: string;
  isActive: boolean;
  model: string | null;
  temperature: number | null;
  maxTokens: number | null;
  notes: string | null;
  createdBy: string | null;
  createdAt: string; // ISO 8601 (UTC)
  updatedAt: string;
}

/** 상세/편집 — 본문 3조각 전문 포함. */
export interface PromptDetail extends PromptSummary {
  systemMd: string;
  rulesMd: string;
  outputSpecMd: string;
}

/** 생성 입력. fromId가 있으면 해당 버전 본문 복제(clone). activate=true면 생성 직후 활성화. */
export interface PromptCreateInput {
  channel?: PromptChannel;
  version: string;
  systemMd?: string;
  rulesMd?: string;
  outputSpecMd?: string;
  model?: string | null;
  temperature?: number | null;
  maxTokens?: number | null;
  notes?: string | null;
  fromId?: number;
  activate?: boolean;
}

/** 부분 수정. 미지정 필드는 변경하지 않는다. isActive=true 전환 시 활성화 트랜잭션. */
export interface PromptUpdateInput {
  version?: string;
  systemMd?: string;
  rulesMd?: string;
  outputSpecMd?: string;
  model?: string | null;
  temperature?: number | null;
  maxTokens?: number | null;
  notes?: string | null;
  isActive?: boolean;
}

/** 플레이그라운드 미리보기 입력. 편집 중 프롬프트(정적) + 샘플 입력(동적). */
export interface PreviewInput {
  promptDraft: {
    systemMd?: string;
    rulesMd?: string;
    outputSpecMd?: string;
    model?: string | null;
    temperature?: number | null;
  };
  sampleInput: {
    keyword: string;
    situation?: string;
    memo?: string;
    toneSamples?: string[];
  };
}

/** 미리보기 결과(저장하지 않음 — contentId 없음). */
export interface PreviewResult {
  draft: BlogDraft;
  model: string;
}
