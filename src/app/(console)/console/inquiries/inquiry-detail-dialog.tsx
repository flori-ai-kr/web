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
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { InquiryStatusBadge, CATEGORY_LABELS } from './inquiry-meta';
import type { InquiryStatus, SupportInquiry } from '@/types/admin';

const isImage = (url: string) => /\.(jpe?g|png|webp|gif)(\?|$)/i.test(url);

const STATUS_OPTIONS: { value: InquiryStatus; label: string }[] = [
  { value: 'open', label: '접수' },
  { value: 'in_progress', label: '처리중' },
  { value: 'resolved', label: '완료' },
  { value: 'closed', label: '종료' },
];

export function InquiryDetailDialog({
  inquiry,
  pending,
  onClose,
  onAnswer,
  onSetStatus,
}: {
  inquiry: SupportInquiry | null;
  pending: boolean;
  onClose: () => void;
  onAnswer: (id: number, answer: string, status: InquiryStatus) => void;
  onSetStatus: (id: number, status: InquiryStatus) => void;
}) {
  const [answer, setAnswer] = useState('');
  const [status, setStatus] = useState<InquiryStatus>('open');

  useEffect(() => {
    if (inquiry) {
      setAnswer(inquiry.answer ?? '');
      setStatus(inquiry.status);
    }
  }, [inquiry]);

  return (
    <Dialog open={!!inquiry} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        {inquiry && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <InquiryStatusBadge status={inquiry.status} />
                {inquiry.title}
              </DialogTitle>
              <DialogDescription>
                {CATEGORY_LABELS[inquiry.category]} · 작성자 {inquiry.userId} ·{' '}
                {inquiry.createdAt.slice(0, 10)}
              </DialogDescription>
            </DialogHeader>

            <div className="whitespace-pre-wrap rounded-lg border border-border bg-muted/40 p-3 text-sm">
              {inquiry.body}
            </div>

            {inquiry.imageUrls.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {inquiry.imageUrls.map((url) =>
                  isImage(url) ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      key={url}
                      src={url}
                      alt="첨부 이미지"
                      className="max-h-40 rounded border border-border"
                    />
                  ) : (
                    <a
                      key={url}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-info underline"
                    >
                      첨부 파일 열기
                    </a>
                  ),
                )}
              </div>
            )}

            {inquiry.answer && (
              <div className="rounded-lg border border-border bg-success-soft/40 p-3 text-sm">
                <div className="mb-1 text-xs font-semibold text-muted-foreground">
                  기존 답변{inquiry.answeredAt ? ` · ${inquiry.answeredAt.slice(0, 10)}` : ''}
                </div>
                <div className="whitespace-pre-wrap">{inquiry.answer}</div>
              </div>
            )}

            <div className="space-y-2">
              <Textarea
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                placeholder="답변 내용을 입력하세요"
                rows={4}
              />
              <div className="flex items-center justify-between gap-2">
                <Select value={status} onValueChange={(v) => setStatus(v as InquiryStatus)}>
                  <SelectTrigger className="w-36">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter className="gap-2">
              <Button
                variant="outline"
                disabled={pending}
                onClick={() => onSetStatus(inquiry.id, status)}
              >
                상태만 변경
              </Button>
              <Button
                disabled={pending}
                onClick={() => onAnswer(inquiry.id, answer, status)}
              >
                답변 저장
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
