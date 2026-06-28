import { listPrompts } from '@/lib/actions/admin-prompts';
import { PromptsClient } from './prompts-client';

// AI 프롬프트 레지스트리 목록(SPEC-AI-008). v1은 blog 채널만.
export default async function PromptsPage() {
  const items = await listPrompts('blog');
  return <PromptsClient initial={items} />;
}
