'use client';

import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import {
  listInquiries,
  answerInquiry,
  setInquiryStatus,
} from '@/lib/actions/admin-inquiries';
import type { InquiryStatus, SupportInquiry } from '@/types/admin';
import { InquiryStatusBadge, InquiryCategoryBadge } from './inquiry-meta';
import { InquiryDetailDialog } from './inquiry-detail-dialog';

const TABS: { value: InquiryStatus; label: string }[] = [
  { value: 'open', label: '접수' },
  { value: 'in_progress', label: '처리중' },
  { value: 'resolved', label: '완료' },
  { value: 'closed', label: '종료' },
];

export function InquiriesClient({ initial }: { initial: SupportInquiry[] }) {
  const [status, setStatus] = useState<InquiryStatus>('open');
  const [rows, setRows] = useState<SupportInquiry[]>(initial);
  const [selected, setSelected] = useState<SupportInquiry | null>(null);
  const [pending, startTransition] = useTransition();

  const load = (next: InquiryStatus) => {
    setStatus(next);
    startTransition(async () => setRows(await listInquiries(next)));
  };
  const refresh = () => startTransition(async () => setRows(await listInquiries(status)));

  const onAnswer = (id: number, answer: string, next: InquiryStatus) => {
    if (!answer.trim()) {
      toast.error('답변 내용을 입력하세요');
      return;
    }
    startTransition(async () => {
      try {
        await answerInquiry(id, answer.trim(), next);
        toast.success('답변이 저장되었습니다');
        setSelected(null);
        refresh();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : '처리 실패');
      }
    });
  };

  const onSetStatus = (id: number, next: InquiryStatus) => {
    startTransition(async () => {
      try {
        await setInquiryStatus(id, next);
        toast.success('상태가 변경되었습니다');
        setSelected(null);
        refresh();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : '처리 실패');
      }
    });
  };

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-semibold">1:1 문의 · 피드백</h1>
      <Tabs value={status} onValueChange={(v) => load(v as InquiryStatus)}>
        <TabsList>
          {TABS.map((t) => (
            <TabsTrigger key={t.value} value={t.value}>
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>카테고리</TableHead>
              <TableHead>제목</TableHead>
              <TableHead>작성자</TableHead>
              <TableHead>상태</TableHead>
              <TableHead>등록일</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                  문의가 없습니다
                </TableCell>
              </TableRow>
            ) : (
              rows.map((q) => (
                <TableRow key={q.id}>
                  <TableCell>
                    <InquiryCategoryBadge category={q.category} />
                  </TableCell>
                  <TableCell className="max-w-xs truncate">{q.title}</TableCell>
                  <TableCell className="tabular-nums">{q.userId}</TableCell>
                  <TableCell>
                    <InquiryStatusBadge status={q.status} />
                  </TableCell>
                  <TableCell className="tabular-nums">{q.createdAt.slice(0, 10)}</TableCell>
                  <TableCell>
                    <Button variant="outline" size="sm" onClick={() => setSelected(q)}>
                      상세
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <InquiryDetailDialog
        inquiry={selected}
        pending={pending}
        onClose={() => setSelected(null)}
        onAnswer={onAnswer}
        onSetStatus={onSetStatus}
      />
    </div>
  );
}
