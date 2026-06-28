'use client';

import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { previewPrompt } from '@/lib/actions/admin-prompts';
import type { PreviewInput, PreviewResult } from '@/types/admin-prompt';

interface Props {
  // 편집 중인(저장 전) 프롬프트 초안 — 미리보기는 항상 현재 폼 값을 쓴다.
  draft: PreviewInput['promptDraft'];
}

/**
 * 플레이그라운드(SPEC-AI-008). 편집 중 프롬프트 + 샘플 입력으로 ai-server를 즉석 호출해
 * 결과만 보여준다. **저장하지 않으며** 활성본·DB에 영향이 없다. LLM 비용이 발생한다.
 */
export function PlaygroundPanel({ draft }: Props) {
  const [keyword, setKeyword] = useState('장미 꽃다발');
  const [situation, setSituation] = useState('');
  const [memo, setMemo] = useState('');
  const [toneSample, setToneSample] = useState('');
  const [result, setResult] = useState<PreviewResult | null>(null);
  const [pending, startTransition] = useTransition();

  const run = () =>
    startTransition(async () => {
      try {
        const res = await previewPrompt({
          promptDraft: draft,
          sampleInput: {
            keyword: keyword.trim() || '장미 꽃다발',
            situation: situation.trim() || undefined,
            memo: memo.trim() || undefined,
            toneSamples: toneSample.trim() ? [toneSample.trim()] : undefined,
          },
        });
        setResult(res);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : '미리보기 생성 실패');
      }
    });

  return (
    <div className="space-y-4 rounded-xl border border-border bg-card p-4">
      <div>
        <h2 className="text-sm font-semibold">플레이그라운드</h2>
        <p className="text-xs text-muted-foreground">
          현재 편집 중인 프롬프트로 즉석 생성합니다. 저장하지 않으며 LLM 비용이 발생합니다.
        </p>
      </div>

      <div className="grid gap-3">
        <div className="space-y-1">
          <Label htmlFor="pg-keyword">키워드</Label>
          <Input
            id="pg-keyword"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="예: 장미 꽃다발"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label htmlFor="pg-situation">상황(선택)</Label>
            <Input
              id="pg-situation"
              value={situation}
              onChange={(e) => setSituation(e.target.value)}
              placeholder="예: 어버이날"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="pg-memo">메모(선택)</Label>
            <Input
              id="pg-memo"
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              placeholder="예: 비누꽃도 추천"
            />
          </div>
        </div>
        <div className="space-y-1">
          <Label htmlFor="pg-tone">말투 샘플(선택)</Label>
          <Textarea
            id="pg-tone"
            value={toneSample}
            onChange={(e) => setToneSample(e.target.value)}
            placeholder="사장님이 직접 쓴 블로그 글 한 편을 붙여넣으면 말투를 모방합니다."
            rows={3}
          />
        </div>
      </div>

      <Button onClick={run} disabled={pending} className="w-full">
        {pending ? '생성 중…' : '미리보기 생성'}
      </Button>

      {result && (
        <div className="space-y-3 border-t border-border pt-3">
          <p className="text-xs text-muted-foreground">모델: {result.model || '기본'}</p>
          <h3 className="text-base font-semibold">{result.draft.title}</h3>
          {result.draft.sections.map((s, i) => (
            <div key={i} className="space-y-1">
              <h4 className="text-sm font-medium">{s.heading}</h4>
              <p className="whitespace-pre-wrap text-sm text-foreground/80">{s.body}</p>
            </div>
          ))}
          {result.draft.faq.length > 0 && (
            <div className="space-y-1">
              <h4 className="text-sm font-medium">FAQ</h4>
              {result.draft.faq.map((f, i) => (
                <p key={i} className="text-sm text-foreground/80">
                  <span className="font-medium">Q. {f.q}</span> — {f.a}
                </p>
              ))}
            </div>
          )}
          {result.draft.hashtags.length > 0 && (
            <p className="text-xs text-muted-foreground">{result.draft.hashtags.join(' ')}</p>
          )}
        </div>
      )}
    </div>
  );
}
