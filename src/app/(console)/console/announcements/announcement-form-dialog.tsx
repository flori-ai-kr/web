'use client';

import { useEffect, useState } from 'react';
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
import type { AnnouncementInput } from '@/lib/actions/admin-announcements';
import type { Announcement, AnnouncementPlacement } from '@/types/admin';

/** ISO 문자열 → date input value(YYYY-MM-DD). */
const toDateValue = (iso: string | null | undefined): string => (iso ? iso.slice(0, 10) : '');
/** date input value → ISO(UTC 자정) 또는 null. */
const toIso = (value: string): string | null => (value ? `${value}T00:00:00Z` : null);

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** 수정 대상. null이면 새 공지 생성 모드. */
  target: Announcement | null;
  pending: boolean;
  onSubmit: (input: AnnouncementInput) => void;
}

export function AnnouncementFormDialog({ open, onOpenChange, target, pending, onSubmit }: Props) {
  const [placement, setPlacement] = useState<AnnouncementPlacement>('modal');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [startsAt, setStartsAt] = useState('');
  const [endsAt, setEndsAt] = useState('');

  // 다이얼로그 오픈 시 대상값으로 폼 초기화
  useEffect(() => {
    if (!open) return;
    setPlacement(target?.placement ?? 'modal');
    setTitle(target?.title ?? '');
    setBody(target?.body ?? '');
    setImageUrl(target?.imageUrl ?? '');
    setLinkUrl(target?.linkUrl ?? '');
    setIsActive(target?.isActive ?? true);
    setStartsAt(toDateValue(target?.startsAt));
    setEndsAt(toDateValue(target?.endsAt));
  }, [open, target]);

  const handleSubmit = () => {
    onSubmit({
      placement,
      title: title.trim(),
      body: body.trim() || null,
      imageUrl: imageUrl.trim() || null,
      linkUrl: linkUrl.trim() || null,
      isActive,
      startsAt: toIso(startsAt),
      endsAt: toIso(endsAt),
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-h-[90vh] overflow-y-auto"
        onKeyDown={(e) => {
          if (e.key === 'Enter' && e.target instanceof HTMLInputElement) e.preventDefault();
        }}
      >
        <DialogHeader>
          <DialogTitle>{target ? '공지 수정' : '새 공지'}</DialogTitle>
          <DialogDescription>
            공지 배너 노출 위치와 내용, 노출 기간을 설정하세요.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="placement">노출 위치</Label>
            <Select
              value={placement}
              onValueChange={(v) => setPlacement(v as AnnouncementPlacement)}
            >
              <SelectTrigger id="placement">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="modal">모달(전면)</SelectItem>
                <SelectItem value="bar">상단바</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="title">제목</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="공지 제목"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="body">내용 (선택)</Label>
            <Textarea
              id="body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="공지 본문"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="imageUrl">이미지 URL (선택)</Label>
            <Input
              id="imageUrl"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="https://"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="linkUrl">링크 URL (선택)</Label>
            <Input
              id="linkUrl"
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              placeholder="https://"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="startsAt">노출 시작 (선택)</Label>
              <Input
                id="startsAt"
                type="date"
                value={startsAt}
                onChange={(e) => setStartsAt(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="endsAt">노출 종료 (선택)</Label>
              <Input
                id="endsAt"
                type="date"
                value={endsAt}
                onChange={(e) => setEndsAt(e.target.value)}
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id="isActive"
              checked={isActive}
              onCheckedChange={(c) => setIsActive(c === true)}
            />
            <Label htmlFor="isActive" className="cursor-pointer">
              활성화
            </Label>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" disabled={pending} onClick={() => onOpenChange(false)}>
            취소
          </Button>
          <Button disabled={pending || !title.trim()} onClick={handleSubmit}>
            {target ? '수정' : '등록'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
