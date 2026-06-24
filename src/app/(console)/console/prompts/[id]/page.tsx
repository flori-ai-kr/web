import { notFound } from 'next/navigation';
import { getPrompt } from '@/lib/actions/admin-prompts';
import { AppError, ErrorCode } from '@/lib/errors';
import type { PromptDetail } from '@/types/admin-prompt';
import { PromptEditorClient } from '../prompt-editor-client';

// 프롬프트 버전 편집 + 플레이그라운드(SPEC-AI-008).
export default async function PromptDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const promptId = Number(id);
  if (!Number.isInteger(promptId) || promptId <= 0) notFound();

  let detail: PromptDetail;
  try {
    detail = await getPrompt(promptId);
  } catch (e) {
    if (e instanceof AppError && (e.code === ErrorCode.NOT_FOUND || e.code === ErrorCode.VALIDATION)) {
      notFound();
    }
    throw e;
  }

  return (
    <PromptEditorClient
      mode="edit"
      initial={{
        id: detail.id,
        channel: 'blog',
        version: detail.version,
        isActive: detail.isActive,
        systemMd: detail.systemMd,
        rulesMd: detail.rulesMd,
        outputSpecMd: detail.outputSpecMd,
        model: detail.model,
        temperature: detail.temperature,
        notes: detail.notes,
      }}
    />
  );
}
