import { getPrompt } from '@/lib/actions/admin-prompts';
import type { EditorInitial } from '../prompt-editor-client';
import { PromptEditorClient } from '../prompt-editor-client';

const EMPTY: EditorInitial = {
  channel: 'blog',
  version: '',
  isActive: false,
  systemMd: '',
  rulesMd: '',
  outputSpecMd: '',
  model: null,
  temperature: null,
  notes: null,
};

// 새 프롬프트 버전 작성(SPEC-AI-008). ?from=<id>면 기존 버전 본문을 복제(clone)해 프리필.
export default async function NewPromptPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string }>;
}) {
  const { from } = await searchParams;
  const fromId = from ? Number(from) : undefined;

  let initial = EMPTY;
  let cloneId: number | undefined;
  if (fromId && Number.isInteger(fromId) && fromId > 0) {
    try {
      const src = await getPrompt(fromId);
      cloneId = src.id;
      initial = {
        ...EMPTY,
        version: `${src.version}-copy`,
        systemMd: src.systemMd,
        rulesMd: src.rulesMd,
        outputSpecMd: src.outputSpecMd,
        model: src.model,
        temperature: src.temperature,
      };
    } catch {
      // 원본을 못 찾으면 빈 폼으로 진행(clone 실패 무시).
    }
  }

  return <PromptEditorClient mode="create" initial={initial} fromId={cloneId} />;
}
