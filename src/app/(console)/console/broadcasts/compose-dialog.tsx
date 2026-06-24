'use client';

import { useState, useTransition, type FormEvent } from 'react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { createBroadcast, previewSegment } from '@/lib/actions/admin-broadcasts';
import type { BroadcastSegment } from '@/types/admin';
import { SEGMENT_OPTIONS } from './segment-labels';

export function ComposeDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
}) {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [deepLink, setDeepLink] = useState('');
  const [segment, setSegment] = useState<BroadcastSegment>('all');
  const [targetCount, setTargetCount] = useState<number | null>(null);
  const [scheduled, setScheduled] = useState(false);
  const [scheduledAt, setScheduledAt] = useState('');
  const [pending, startTransition] = useTransition();

  const reset = () => {
    setTitle('');
    setBody('');
    setDeepLink('');
    setSegment('all');
    setTargetCount(null);
    setScheduled(false);
    setScheduledAt('');
  };

  const onSegmentChange = (next: BroadcastSegment) => {
    setSegment(next);
    setTargetCount(null);
    startTransition(async () => {
      try {
        const preview = await previewSegment(next);
        setTargetCount(preview.targetCount);
      } catch {
        setTargetCount(null);
      }
    });
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !body.trim()) {
      toast.error('제목과 내용을 입력하세요');
      return;
    }
    if (scheduled && !scheduledAt) {
      toast.error('예약 일시를 입력하세요');
      return;
    }
    startTransition(async () => {
      try {
        await createBroadcast({
          title: title.trim(),
          body: body.trim(),
          deepLink: deepLink.trim() || null,
          segment,
          scheduledAt: scheduled ? scheduledAt : null,
        });
        toast.success(scheduled ? '예약되었습니다' : '초안이 저장되었습니다');
        reset();
        onOpenChange(false);
        onCreated();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : '저장 실패');
      }
    });
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) reset();
        onOpenChange(o);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>새 브로드캐스트</DialogTitle>
          <DialogDescription>대상 세그먼트를 선택하고 푸시 알림을 작성하세요.</DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="bc-title">제목</Label>
            <Input
              id="bc-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="알림 제목"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="bc-body">내용</Label>
            <Textarea
              id="bc-body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="알림 내용"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="bc-link">딥링크</Label>
            <Input
              id="bc-link"
              value={deepLink}
              onChange={(e) => setDeepLink(e.target.value)}
              placeholder="/admin/marketing"
            />
          </div>
          <div className="space-y-1.5">
            <Label>세그먼트</Label>
            <Select value={segment} onValueChange={(v) => onSegmentChange(v as BroadcastSegment)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SEGMENT_OPTIONS.map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {targetCount !== null && (
              <p className="text-sm text-muted-foreground">
                예상 대상 <span className="font-semibold tabular-nums text-foreground">{targetCount}</span>명
              </p>
            )}
          </div>
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={scheduled}
                onCheckedChange={(c) => setScheduled(c === true)}
              />
              예약 발송
            </label>
            {scheduled && (
              <Input
                type="datetime-local"
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
              />
            )}
          </div>
          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                reset();
                onOpenChange(false);
              }}
            >
              취소
            </Button>
            <Button type="submit" disabled={pending}>
              {scheduled ? '예약' : '저장'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
