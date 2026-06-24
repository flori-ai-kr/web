// src/app/(admin)/admin/support/create-inquiry-modal.tsx
'use client';

import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ImagePlus, Loader2 } from 'lucide-react';
import { createInquiry, createInquiryUploadTargets } from '@/lib/actions/support';
import type { InquiryCategory, MyInquiry } from '@/types/support';

const CATEGORIES: { value: InquiryCategory; label: string }[] = [
  { value: 'bug', label: '버그 제보 🐛' },
  { value: 'feature', label: '기능 제안 💡' },
  { value: 'feedback', label: '피드백 🙌' },
  { value: 'account', label: '계정 문의' },
  { value: 'payment', label: '결제 문의' },
  { value: 'etc', label: '기타' },
];

export function CreateInquiryModal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (inquiry: MyInquiry) => void;
}) {
  const [category, setCategory] = useState<InquiryCategory>('bug');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [pending, startTransition] = useTransition();

  const reset = () => {
    setCategory('bug');
    setTitle('');
    setBody('');
    setFiles([]);
  };

  const handleSubmit = () => {
    if (!title.trim() || !body.trim()) {
      toast.error('제목과 내용을 입력해주세요');
      return;
    }
    startTransition(async () => {
      try {
        let imageUrls: string[] = [];
        if (files.length > 0) {
          const targets = await createInquiryUploadTargets(
            files.map((f) => ({ name: f.name, type: f.type, size: f.size })),
          );
          await Promise.all(
            targets.map((t, i) =>
              fetch(t.uploadUrl, {
                method: 'PUT',
                headers: { 'Content-Type': files[i].type || 'image/jpeg' },
                body: files[i],
              }).then((res) => {
                if (!res.ok) throw new Error('이미지 업로드 실패');
              }),
            ),
          );
          imageUrls = targets.map((t) => t.publicUrl);
        }
        const result = await createInquiry({
          category,
          title: title.trim(),
          body: body.trim(),
          imageUrls,
        });
        toast.success('문의가 접수되었어요!');
        reset();
        onCreated(result);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : '문의 제출에 실패했어요');
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>새 문의 작성</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">카테고리</label>
            <Select value={category} onValueChange={(v) => setCategory(v as InquiryCategory)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((c) => (
                  <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">제목</label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="한 줄로 요약해주세요"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">내용</label>
            <Textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="자세히 적어주시면 더 빨리 도움드릴 수 있어요"
              rows={4}
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">
              첨부 이미지 (선택, 최대 5장)
            </label>
            <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground transition-colors hover:border-brand hover:text-brand">
              <ImagePlus className="h-4 w-4" />
              {files.length > 0 ? `${files.length}장 선택됨` : '이미지를 선택하세요'}
              <input
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => {
                  const selected = Array.from(e.target.files ?? []).slice(0, 5);
                  setFiles(selected);
                }}
              />
            </label>
          </div>
        </div>

        <Button onClick={handleSubmit} disabled={pending} className="mt-2 w-full">
          {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          제출하기
        </Button>
      </DialogContent>
    </Dialog>
  );
}
