'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { StatusBadge } from '@/components/console/status-badge';
import { activatePrompt, createPrompt, deletePrompt, updatePrompt } from '@/lib/actions/admin-prompts';
import { ALLOWED_PROMPT_MODELS } from '@/types/admin-prompt';
import { PlaygroundPanel } from './components/playground-panel';

export interface EditorInitial {
  id?: number;
  channel: 'blog';
  version: string;
  isActive: boolean;
  systemMd: string;
  rulesMd: string;
  outputSpecMd: string;
  model: string | null;
  temperature: number | null;
  notes: string | null;
}

const MODEL_DEFAULT = '__default__';

export function PromptEditorClient({
  mode,
  initial,
  fromId,
}: {
  mode: 'create' | 'edit';
  initial: EditorInitial;
  fromId?: number;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const [version, setVersion] = useState(initial.version);
  const [systemMd, setSystemMd] = useState(initial.systemMd);
  const [rulesMd, setRulesMd] = useState(initial.rulesMd);
  const [outputSpecMd, setOutputSpecMd] = useState(initial.outputSpecMd);
  const [model, setModel] = useState<string>(initial.model ?? MODEL_DEFAULT);
  const [temperature, setTemperature] = useState<string>(
    initial.temperature == null ? '' : String(initial.temperature),
  );
  const [notes, setNotes] = useState(initial.notes ?? '');

  const resolvedModel = model === MODEL_DEFAULT ? null : model;
  const resolvedTemp = temperature.trim() === '' ? null : Number(temperature);

  const draftForPreview = {
    systemMd,
    rulesMd,
    outputSpecMd,
    model: resolvedModel,
    temperature: resolvedTemp,
  };

  const onSave = () =>
    startTransition(async () => {
      try {
        if (mode === 'create') {
          const created = await createPrompt({
            version: version.trim(),
            systemMd,
            rulesMd,
            outputSpecMd,
            model: resolvedModel,
            temperature: resolvedTemp,
            notes: notes.trim() || undefined,
            fromId,
          });
          toast.success('생성되었습니다');
          router.push(`/console/prompts/${created.id}`);
        } else {
          await updatePrompt(initial.id!, {
            version: version.trim(),
            systemMd,
            rulesMd,
            outputSpecMd,
            model: resolvedModel,
            temperature: resolvedTemp,
            notes: notes.trim() || undefined,
          });
          toast.success('저장되었습니다');
          router.refresh();
        }
      } catch (e) {
        toast.error(e instanceof Error ? e.message : '저장 실패');
      }
    });

  const onActivate = () =>
    startTransition(async () => {
      try {
        await activatePrompt(initial.id!);
        toast.success('활성화되었습니다');
        router.refresh();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : '활성화 실패');
      }
    });

  const onDelete = () =>
    startTransition(async () => {
      try {
        await deletePrompt(initial.id!);
        toast.success('삭제되었습니다');
        router.push('/console/prompts');
      } catch (e) {
        toast.error(e instanceof Error ? e.message : '삭제 실패');
      }
    });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <h1 className="text-lg font-semibold">
            {mode === 'create' ? '새 프롬프트 버전' : `프롬프트 편집 · ${initial.version}`}
          </h1>
          {mode === 'edit' && (
            <StatusBadge tone={initial.isActive ? 'success' : 'muted'}>
              {initial.isActive ? '활성' : '비활성'}
            </StatusBadge>
          )}
        </div>
        <div className="flex gap-2">
          {mode === 'edit' && !initial.isActive && (
            <Button variant="outline" disabled={pending} onClick={onActivate}>
              활성화
            </Button>
          )}
          {mode === 'edit' && !initial.isActive && (
            <Button variant="outline" className="text-destructive" disabled={pending} onClick={onDelete}>
              삭제
            </Button>
          )}
          <Button disabled={pending} onClick={onSave}>
            {mode === 'create' ? '생성' : '저장'}
          </Button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* 좌: 편집 폼 */}
        <div className="space-y-4 rounded-xl border border-border bg-card p-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="version">버전</Label>
              <Input
                id="version"
                value={version}
                onChange={(e) => setVersion(e.target.value)}
                placeholder="예: v2-말투강화"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="model">모델</Label>
              <Select value={model} onValueChange={setModel}>
                <SelectTrigger id="model">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={MODEL_DEFAULT}>기본(ai-server)</SelectItem>
                  {ALLOWED_PROMPT_MODELS.map((m) => (
                    <SelectItem key={m} value={m}>
                      {m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="temperature">temperature</Label>
              <Input
                id="temperature"
                type="number"
                min={0}
                max={2}
                step={0.1}
                value={temperature}
                onChange={(e) => setTemperature(e.target.value)}
                placeholder="기본값"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="notes">변경 메모</Label>
              <Input
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="예: 말투 모방 강조"
              />
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="systemMd">시스템 프롬프트 (페르소나·말투 지시)</Label>
            <Textarea
              id="systemMd"
              value={systemMd}
              onChange={(e) => setSystemMd(e.target.value)}
              rows={10}
              className="font-mono text-xs"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="rulesMd">GEO 규칙 (글 구조)</Label>
            <Textarea
              id="rulesMd"
              value={rulesMd}
              onChange={(e) => setRulesMd(e.target.value)}
              rows={8}
              className="font-mono text-xs"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="outputSpecMd">출력 스펙 (JSON 형식 지시)</Label>
            <Textarea
              id="outputSpecMd"
              value={outputSpecMd}
              onChange={(e) => setOutputSpecMd(e.target.value)}
              rows={4}
              className="font-mono text-xs"
            />
          </div>
          <p className="text-xs text-muted-foreground">
            비워 두면 ai-server의 코드 기본값(geo_rules.py)으로 폴백합니다. 키워드·말투샘플·매장맥락 등
            동적 데이터는 생성 시 게이트웨이가 자동 주입합니다(여기서 입력하지 않습니다).
          </p>
        </div>

        {/* 우: 플레이그라운드 */}
        <PlaygroundPanel draft={draftForPreview} />
      </div>
    </div>
  );
}
